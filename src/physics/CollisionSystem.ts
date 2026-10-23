/**
 * Collision detection and resolution.
 *
 * The player is a circle on the ground plane (radius ~0.42 m) and the world is
 * a list of rotatable rectangles and circles. That is enough for a walkable
 * campus and it is cheap: no broadphase structure, no physics engine, no
 * per-triangle tests against the merged campus mesh.
 *
 * Resolution is iterative push-out rather than "block the axis that collided",
 * which is what lets the player slide smoothly along the angled campus sign and
 * the rotated courtyard inlay instead of sticking to them.
 *
 * LIMITATION (Phase 1): everything is 2D. There is no floor height, no stairs
 * and no ceiling, so raised verandahs are modelled as solid rather than
 * walkable. Vertical movement is Phase 2 work.
 */

import type { CampusBounds, Collider, Vec2Tuple } from '../types';

/** Push-out passes per frame. Three resolves almost every corner case. */
const RESOLUTION_PASSES = 3;

/** Pre-computed per collider so the broad-phase reject is two comparisons. */
interface PreparedCollider {
  readonly collider: Collider;
  /** Half-width of an axis-aligned box that fully contains the collider. */
  readonly extentX: number;
  readonly extentZ: number;
  readonly cos: number;
  readonly sin: number;
}

export class CollisionSystem {
  private prepared: PreparedCollider[];

  constructor(
    colliders: readonly Collider[],
    private bounds: CampusBounds,
  ) {
    this.prepared = colliders.map((collider) => prepare(collider));
  }

  /**
   * Swaps in a different world — the campus, or an interior — without
   * replacing the system. The player controller and camera rig keep their
   * reference to this object, so they follow the player indoors for free.
   */
  replace(colliders: readonly Collider[], bounds: CampusBounds): void {
    this.prepared = colliders.map((collider) => prepare(collider));
    this.bounds = bounds;
  }

  get colliderCount(): number {
    return this.prepared.length;
  }

  /**
   * Resolves a desired position against the world.
   *
   * Takes the position the player WANTS to be at and returns the nearest
   * position they are actually allowed to occupy.
   */
  resolve(desiredX: number, desiredZ: number, radius: number): Vec2Tuple {
    let x = desiredX;
    let z = desiredZ;

    for (let pass = 0; pass < RESOLUTION_PASSES; pass += 1) {
      let moved = false;

      for (const entry of this.prepared) {
        // Broad phase: skip anything that cannot possibly be touching.
        if (
          Math.abs(x - entry.collider.x) > entry.extentX + radius ||
          Math.abs(z - entry.collider.z) > entry.extentZ + radius
        ) {
          continue;
        }

        const pushed =
          entry.collider.kind === 'box'
            ? resolveBox(x, z, radius, entry)
            : resolveCircle(x, z, radius, entry.collider);

        if (pushed) {
          x = pushed[0];
          z = pushed[1];
          moved = true;
        }
      }

      // Settled early — no collider moved us this pass.
      if (!moved) {
        break;
      }
    }

    return [
      clamp(x, this.bounds.minX + radius, this.bounds.maxX - radius),
      clamp(z, this.bounds.minZ + radius, this.bounds.maxZ - radius),
    ];
  }

  /** True when a circle at this position overlaps anything. Used to vet spawns. */
  isBlocked(x: number, z: number, radius: number): boolean {
    const [resolvedX, resolvedZ] = this.resolve(x, z, radius);
    return Math.abs(resolvedX - x) > 1e-4 || Math.abs(resolvedZ - z) > 1e-4;
  }
}

function prepare(collider: Collider): PreparedCollider {
  if (collider.kind === 'circle') {
    return {
      collider,
      extentX: collider.radius,
      extentZ: collider.radius,
      cos: 1,
      sin: 0,
    };
  }

  const cos = Math.cos(collider.rotationY);
  const sin = Math.sin(collider.rotationY);
  // World-space bounding box of the rotated rectangle.
  return {
    collider,
    extentX: Math.abs(collider.halfWidth * cos) + Math.abs(collider.halfDepth * sin),
    extentZ: Math.abs(collider.halfWidth * sin) + Math.abs(collider.halfDepth * cos),
    cos,
    sin,
  };
}

/**
 * Circle versus rotated rectangle.
 *
 * Works in the box's local frame, where the problem reduces to "clamp the point
 * into the rectangle and measure how far away it was".
 */
function resolveBox(
  x: number,
  z: number,
  radius: number,
  entry: PreparedCollider,
): Vec2Tuple | null {
  const box = entry.collider;
  if (box.kind !== 'box') {
    return null;
  }

  const dx = x - box.x;
  const dz = z - box.z;
  // World -> local. Inverse of the rotation used by `offsetLocal`.
  const localX = dx * entry.cos - dz * entry.sin;
  const localZ = dx * entry.sin + dz * entry.cos;

  const insideX = Math.abs(localX) <= box.halfWidth;
  const insideZ = Math.abs(localZ) <= box.halfDepth;

  let resolvedX: number;
  let resolvedZ: number;

  if (insideX && insideZ) {
    // The centre is inside the rectangle — usually only reachable by teleporting
    // or a very large single-frame step. Eject along whichever face is nearest.
    const escapeX = box.halfWidth - Math.abs(localX);
    const escapeZ = box.halfDepth - Math.abs(localZ);
    if (escapeX < escapeZ) {
      resolvedX = Math.sign(localX || 1) * (box.halfWidth + radius);
      resolvedZ = localZ;
    } else {
      resolvedX = localX;
      resolvedZ = Math.sign(localZ || 1) * (box.halfDepth + radius);
    }
  } else {
    const closestX = clamp(localX, -box.halfWidth, box.halfWidth);
    const closestZ = clamp(localZ, -box.halfDepth, box.halfDepth);
    const normalX = localX - closestX;
    const normalZ = localZ - closestZ;
    const distance = Math.hypot(normalX, normalZ);

    if (distance >= radius) {
      return null; // Not touching.
    }

    if (distance < 1e-6) {
      // Exactly on an edge or corner, so there is no usable contact normal.
      // Push out along local +X: arbitrary, but stable frame to frame.
      resolvedX = closestX + radius;
      resolvedZ = closestZ;
    } else {
      const scale = radius / distance;
      resolvedX = closestX + normalX * scale;
      resolvedZ = closestZ + normalZ * scale;
    }
  }

  // Local -> world.
  return [
    box.x + resolvedX * entry.cos + resolvedZ * entry.sin,
    box.z - resolvedX * entry.sin + resolvedZ * entry.cos,
  ];
}

/** Circle versus circle: push straight out along the line of centres. */
function resolveCircle(
  x: number,
  z: number,
  radius: number,
  circle: Extract<Collider, { kind: 'circle' }>,
): Vec2Tuple | null {
  const dx = x - circle.x;
  const dz = z - circle.z;
  const minimum = circle.radius + radius;
  const distanceSquared = dx * dx + dz * dz;

  if (distanceSquared >= minimum * minimum) {
    return null;
  }

  const distance = Math.sqrt(distanceSquared);
  if (distance < 1e-6) {
    // Dead centre: push along +X so the result is deterministic.
    return [circle.x + minimum, circle.z];
  }

  const scale = minimum / distance;
  return [circle.x + dx * scale, circle.z + dz * scale];
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
