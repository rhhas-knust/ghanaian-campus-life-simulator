/**
 * Primitive shape helpers.
 *
 * World modules describe the campus in human terms — "a 1.8 m square pillar,
 * 6 m tall, here" — and this module turns that into geometry submitted to the
 * `GeometryBatcher`.
 *
 * Every primitive is built ONCE at unit size and reused: the per-object
 * transform is baked in by the batcher. That keeps allocation during world
 * generation down to one `Matrix4` per call, which is why the whole campus
 * builds in well under a second even on a phone.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Vector3,
} from 'three';

import type { MaterialKey } from '../config/palette';
import type { SizeTuple, Vec2Tuple } from '../types';
import type { GeometryBatcher } from './GeometryBatcher';

/** `[x, y, z]` in metres. */
export type Vec3Tuple = readonly [x: number, y: number, z: number];

const DEG_TO_RAD = Math.PI / 180;

/** Converts the degrees used throughout the data files into radians. */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

// ---------------------------------------------------------------------------
// Unit primitives, created once at module load.
// ---------------------------------------------------------------------------

/** Lazily-built cylinder variants, keyed by taper + segment count. */
const cylinderCache = new Map<string, BufferGeometry>();

/** Horizontal 1 x 1 plane, facing straight up, centred on the origin. */
const UNIT_GROUND = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** Flat disc of radius 1 facing up — plazas, roundabouts, court markings. */
const UNIT_DISC = new CircleGeometry(1, 40).rotateX(-Math.PI / 2);

/** Vertical 1 x 1 quad facing +Z — sign lettering. UVs are rewritten per label. */
const UNIT_LABEL = new PlaneGeometry(1, 1);

/** Low-poly 1-radius ball, used for tree canopies and shrubs. */
const UNIT_BLOB_DETAIL_0 = new IcosahedronGeometry(1, 0);
const UNIT_BLOB_DETAIL_1 = new IcosahedronGeometry(1, 1);

/** 4-sided cone = a pyramid, used for hip roofs. Pre-rotated so the base is square. */
const UNIT_PYRAMID = new ConeGeometry(1, 1, 4, 1).rotateY(Math.PI / 4);

/**
 * Triangular prism, 1 x 1 x 1, sitting on y = 0 with its ridge running along Z.
 *
 * This is the gable roof — by far the most common roof form on a Ghanaian
 * campus block, and not something Three.js provides out of the box.
 */
function createUnitPrism(): BufferGeometry {
  const h = 1;
  const hx = 0.5;
  const hz = 0.5;

  const a = new Vector3(-hx, 0, -hz);
  const b = new Vector3(hx, 0, -hz);
  const c = new Vector3(0, h, -hz);
  const d = new Vector3(-hx, 0, hz);
  const e = new Vector3(hx, 0, hz);
  const f = new Vector3(0, h, hz);

  // Wound counter-clockwise as seen from outside, so face normals point out.
  const triangles: Vector3[][] = [
    [a, c, b], // south gable end
    [d, e, f], // north gable end
    [a, d, f], // west slope
    [a, f, c],
    [b, c, f], // east slope
    [b, f, e],
    [a, b, e], // underside
    [a, e, d],
  ];

  const positions = new Float32Array(triangles.length * 9);
  const uvs = new Float32Array(triangles.length * 6);

  let p = 0;
  let u = 0;
  for (const triangle of triangles) {
    for (const vertex of triangle) {
      positions[p++] = vertex.x;
      positions[p++] = vertex.y;
      positions[p++] = vertex.z;
      // Cheap planar UVs. Phase 1 is untextured; this exists so the attribute
      // layout matches the other primitives and merging succeeds.
      uvs[u++] = vertex.x + 0.5;
      uvs[u++] = vertex.y > 0 ? 1 : vertex.z + 0.5;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  // Non-indexed geometry gets true per-face normals — exactly what we want for
  // a crisp roof ridge.
  geometry.computeVertexNormals();
  return geometry;
}

const UNIT_PRISM = createUnitPrism();

function getCylinder(radiusTopRatio: number, segments: number): BufferGeometry {
  const key = `${radiusTopRatio}|${segments}`;
  const cached = cylinderCache.get(key);
  if (cached) {
    return cached;
  }
  // Radius 1 at the base, height 1, centred on the origin.
  const geometry = new CylinderGeometry(radiusTopRatio, 1, 1, segments, 1);
  cylinderCache.set(key, geometry);
  return geometry;
}

// ---------------------------------------------------------------------------
// ShapeBuilder
// ---------------------------------------------------------------------------

export interface CylinderOptions {
  readonly at: Vec2Tuple;
  readonly baseY: number;
  readonly radius: number;
  /** Top radius as a fraction of `radius`. 1 = straight, 0 = a cone. */
  readonly radiusTopRatio?: number;
  readonly height: number;
  readonly segments?: number;
  readonly rotationY?: number;
}

export interface RoofOptions {
  readonly at: Vec2Tuple;
  /** Eaves level — the top of the walls. */
  readonly baseY: number;
  readonly width: number;
  readonly depth: number;
  /** Ridge/apex height above `baseY`. */
  readonly height: number;
  readonly rotationY?: number;
}

export interface BlobOptions {
  readonly centre: Vec3Tuple;
  readonly radius: number;
  /** 0 = 20 faces (default, cheapest). 1 = 80 faces, for hero canopies. */
  readonly detail?: 0 | 1;
  /** Non-uniform squash, e.g. `[1, 0.7, 1]` for a flattened canopy. */
  readonly squash?: Vec3Tuple;
  readonly rotationY?: number;
}

/**
 * Thin wrapper over the batcher that speaks in buildings and benches rather
 * than vertices. All `rotationY` values are in DEGREES, matching the data files.
 */
export class ShapeBuilder {
  /** Scratch matrix — reused to avoid allocating per shape. */
  private readonly matrix = new Matrix4();
  private readonly scratchA = new Matrix4();
  private readonly scratchB = new Matrix4();

  constructor(private readonly batcher: GeometryBatcher) {}

  /** Box positioned by its centre. */
  box(material: MaterialKey, centre: Vec3Tuple, size: SizeTuple, rotationY = 0): void {
    this.compose(centre, size, rotationY);
    this.batcher.add(material, boxGeometry(), this.matrix);
  }

  /**
   * Box positioned by the centre of its BOTTOM face.
   *
   * This is the common case: walls, plinths and pillars are all described by a
   * footprint and a height in the data files.
   */
  boxAt(
    material: MaterialKey,
    footprintCentre: Vec2Tuple,
    baseY: number,
    size: SizeTuple,
    rotationY = 0,
  ): void {
    const [width, height, depth] = size;
    this.box(
      material,
      [footprintCentre[0], baseY + height / 2, footprintCentre[1]],
      [width, height, depth],
      rotationY,
    );
  }

  /** A flat horizontal quad — ground patches, walkways, water. Two triangles. */
  ground(
    material: MaterialKey,
    centre: Vec2Tuple,
    size: readonly [width: number, depth: number],
    y: number,
    rotationY = 0,
  ): void {
    this.compose([centre[0], y, centre[1]], [size[0], 1, size[1]], rotationY);
    this.batcher.add(material, UNIT_GROUND, this.matrix);
  }

  /** Vertical cylinder — tree trunks, lamp posts, columns, flagpoles. */
  cylinder(material: MaterialKey, options: CylinderOptions): void {
    const segments = options.segments ?? 8;
    const ratio = options.radiusTopRatio ?? 1;
    const geometry = getCylinder(ratio, segments);
    // The unit cylinder has radius 1, i.e. DIAMETER 2, so the scale is the
    // requested radius, not the diameter.
    this.compose(
      [options.at[0], options.baseY + options.height / 2, options.at[1]],
      [options.radius, options.height, options.radius],
      options.rotationY ?? 0,
    );
    this.batcher.add(material, geometry, this.matrix);
  }

  /** Four-sided pyramid — hip roofs, and the caps on gate pillars. */
  pyramid(material: MaterialKey, options: RoofOptions): void {
    // `UNIT_PYRAMID` is pre-rotated 45 degrees, which leaves its base a square
    // of side sqrt(2) rather than the requested 1 - so divide that back out.
    const inverseSqrt2 = 1 / Math.SQRT2;
    this.compose(
      [options.at[0], options.baseY + options.height / 2, options.at[1]],
      [options.width * inverseSqrt2, options.height, options.depth * inverseSqrt2],
      options.rotationY ?? 0,
    );
    this.batcher.add(material, UNIT_PYRAMID, this.matrix);
  }

  /** Triangular prism — gable roofs. The ridge runs along the depth (Z) axis. */
  gable(material: MaterialKey, options: RoofOptions): void {
    this.compose(
      [options.at[0], options.baseY, options.at[1]],
      [options.width, options.height, options.depth],
      options.rotationY ?? 0,
    );
    this.batcher.add(material, UNIT_PRISM, this.matrix);
  }

  /** Low-poly ball — tree canopies, shrubs, planter planting. */
  blob(material: MaterialKey, options: BlobOptions): void {
    const squash = options.squash ?? ([1, 1, 1] as const);
    const r = options.radius;
    this.compose(
      options.centre,
      [r * 2 * squash[0], r * 2 * squash[1], r * 2 * squash[2]],
      options.rotationY ?? 0,
    );
    // Divide by 2: the unit blob already has radius 1 (diameter 2).
    this.matrix.multiply(this.scratchB.makeScale(0.5, 0.5, 0.5));
    this.batcher.add(
      material,
      options.detail === 1 ? UNIT_BLOB_DETAIL_1 : UNIT_BLOB_DETAIL_0,
      this.matrix,
    );
  }

  /**
   * Box rotated about the X axis as well as Y — used for sloped shapes such as
   * palm fronds and roller-door canopies.
   */
  tiltedBox(
    material: MaterialKey,
    centre: Vec3Tuple,
    size: SizeTuple,
    rotationYDegrees: number,
    tiltXDegrees: number,
  ): void {
    this.matrix
      .makeTranslation(centre[0], centre[1], centre[2])
      .multiply(this.scratchA.makeRotationY(degToRad(rotationYDegrees)))
      .multiply(this.scratchB.makeRotationX(degToRad(tiltXDegrees)))
      .multiply(this.scratchA.makeScale(size[0], size[1], size[2]));
    this.batcher.add(material, boxGeometry(), this.matrix);
  }

  /** Flat disc, e.g. the courtyard plaza or the roundabout island. */
  disc(material: MaterialKey, centre: Vec2Tuple, radius: number, y: number): void {
    this.compose([centre[0], y, centre[1]], [radius, 1, radius], 0);
    this.batcher.add(material, UNIT_DISC, this.matrix);
  }

  /**
   * A true hip roof: four slopes meeting a ridge that runs along the longer
   * side. The concept art uses hip roofs on every building; a four-sided
   * pyramid stretched over a long wing reads as a tent, so this builds the real
   * shape. The geometry is sized per call, so it is created, submitted and
   * freed here rather than cached.
   */
  hipRoof(material: MaterialKey, options: RoofOptions): void {
    const geometry = createHipRoof(options.width, options.depth, options.height);
    this.compose([options.at[0], options.baseY, options.at[1]], [1, 1, 1], options.rotationY ?? 0);
    this.batcher.add(material, geometry, this.matrix);
    geometry.dispose();
  }

  /**
   * Vertical quad showing one cell of the sign-text atlas. `uv` is
   * `[u0, v0, u1, v1]` in texture space. The quad faces `rotationY` (degrees;
   * 0 = facing south, +Z).
   */
  label(
    material: MaterialKey,
    centre: Vec3Tuple,
    width: number,
    height: number,
    rotationY: number,
    uv: readonly [number, number, number, number],
  ): void {
    const geometry = UNIT_LABEL.clone();
    const [u0, v0, u1, v1] = uv;
    // PlaneGeometry vertex order: top-left, top-right, bottom-left, bottom-right.
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([u0, v1, u1, v1, u0, v0, u1, v0]), 2));
    this.compose(centre, [width, height, 1], rotationY);
    this.batcher.add(material, geometry, this.matrix);
    geometry.dispose();
  }

  /** Builds `translate * rotateY * scale` into the scratch matrix. */
  private compose(centre: Vec3Tuple, scale: SizeTuple, rotationYDegrees: number): void {
    this.matrix
      .makeTranslation(centre[0], centre[1], centre[2])
      .multiply(this.scratchA.makeRotationY(degToRad(rotationYDegrees)))
      .multiply(this.scratchB.makeScale(scale[0], scale[1], scale[2]));
  }
}

// ---------------------------------------------------------------------------
// Hip roof geometry
// ---------------------------------------------------------------------------

/**
 * Hip roof sitting on y = 0, `width` along X, `depth` along Z, apex `height`.
 * The ridge runs along whichever side is longer, with length `long - short`,
 * which keeps all four slopes at the same pitch.
 */
function createHipRoof(width: number, depth: number, height: number): BufferGeometry {
  const alongX = width >= depth;
  const long = alongX ? width : depth;
  const short = alongX ? depth : width;
  const halfRidge = Math.max(0, (long - short) / 2);
  const hl = long / 2;
  const hs = short / 2;

  // Built with the ridge on local X, then swizzled if the ridge belongs on Z.
  const corners = {
    a: new Vector3(-hl, 0, hs),
    b: new Vector3(hl, 0, hs),
    c: new Vector3(hl, 0, -hs),
    d: new Vector3(-hl, 0, -hs),
    r1: new Vector3(-halfRidge, height, 0),
    r2: new Vector3(halfRidge, height, 0),
  };
  const triangles: Vector3[][] = [
    [corners.a, corners.b, corners.r2], // south slope (trapezoid)
    [corners.a, corners.r2, corners.r1],
    [corners.c, corners.d, corners.r1], // north slope (trapezoid)
    [corners.c, corners.r1, corners.r2],
    [corners.b, corners.c, corners.r2], // east hip
    [corners.d, corners.a, corners.r1], // west hip
    [corners.a, corners.d, corners.c], // underside, seen from the verandahs
    [corners.a, corners.c, corners.b],
  ];

  const positions = new Float32Array(triangles.length * 9);
  const uvs = new Float32Array(triangles.length * 6);
  let p = 0;
  let u = 0;
  for (const triangle of triangles) {
    for (const vertex of triangle) {
      const x = alongX ? vertex.x : vertex.z;
      const z = alongX ? vertex.z : -vertex.x;
      positions[p++] = x;
      positions[p++] = vertex.y;
      positions[p++] = z;
      uvs[u++] = x / long + 0.5;
      uvs[u++] = z / long + 0.5;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  // Non-indexed, so these are true per-face normals: crisp hips and ridge.
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Unit box, built lazily so the module has no ordering constraints.
// ---------------------------------------------------------------------------

let cachedBox: BufferGeometry | null = null;

function boxGeometry(): BufferGeometry {
  if (cachedBox) {
    return cachedBox;
  }
  // Six quads, hand-wound, centred on the origin with a side of 1.
  const faces: { normal: Vec3Tuple; corners: Vec3Tuple[] }[] = [
    { normal: [0, 0, 1], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]] },
    { normal: [0, 0, -1], corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]] },
    { normal: [1, 0, 0], corners: [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]] },
    { normal: [-1, 0, 0], corners: [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, 1, 0], corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]] },
    { normal: [0, -1, 0], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]] },
  ];

  const positions = new Float32Array(faces.length * 18);
  const normals = new Float32Array(faces.length * 18);
  const uvs = new Float32Array(faces.length * 12);
  const quadUvs: Vec2Tuple[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const order = [0, 1, 2, 0, 2, 3];

  let p = 0;
  let n = 0;
  let u = 0;
  for (const face of faces) {
    for (const index of order) {
      const corner = face.corners[index] as Vec3Tuple;
      const uv = quadUvs[index] as Vec2Tuple;
      positions[p++] = corner[0];
      positions[p++] = corner[1];
      positions[p++] = corner[2];
      normals[n++] = face.normal[0];
      normals[n++] = face.normal[1];
      normals[n++] = face.normal[2];
      uvs[u++] = uv[0];
      uvs[u++] = uv[1];
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  cachedBox = geometry;
  return geometry;
}

/** Frees the shared unit primitives. Called on teardown. */
export function disposeSharedGeometry(): void {
  cachedBox?.dispose();
  cachedBox = null;
  UNIT_GROUND.dispose();
  UNIT_DISC.dispose();
  UNIT_LABEL.dispose();
  UNIT_BLOB_DETAIL_0.dispose();
  UNIT_BLOB_DETAIL_1.dispose();
  UNIT_PYRAMID.dispose();
  UNIT_PRISM.dispose();
  for (const geometry of cylinderCache.values()) {
    geometry.dispose();
  }
  cylinderCache.clear();
}

/**
 * Converts a point expressed in a building's LOCAL axes into world `[x, z]`.
 *
 * Data files describe buildings in their own frame ("2.6 m right of centre, on
 * the front face") and then rotate the whole thing. This keeps that readable
 * without every call site re-deriving a sine and a cosine.
 *
 * Matches Three.js' `rotateY`: `x' = x·cos + z·sin`, `z' = -x·sin + z·cos`.
 */
export function offsetLocal(
  centre: Vec2Tuple,
  rotationYDegrees: number,
  localX: number,
  localZ: number,
): Vec2Tuple {
  const angle = degToRad(rotationYDegrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [centre[0] + localX * cos + localZ * sin, centre[1] - localX * sin + localZ * cos];
}
