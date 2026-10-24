/**
 * Round, north-up minimap, styled after GAME_ART/ui-ux/minimap_reference.jpeg.
 *
 * The whole campus is drawn ONCE, at load, into an offscreen canvas straight
 * from the layout data — the same rectangles the 3D world is built from, so the
 * map can never disagree with the world. Each update then copies a window of
 * that image centred on the player and draws a heading arrow on top: one
 * `drawImage` and a triangle, throttled to about 15 times a second.
 */

import {
  BASKETBALL_COURT,
  BRIDGES,
  BUILDINGS,
  CAMPUS_BOUNDS,
  CAR_PARKS,
  FOOTBALL_FIELD,
  HEDGES,
  PATHS,
  ROADS,
  ROAD_DISCS,
  planLength,
  planPoint,
  planRect,
  type PlanRect,
} from '../config/campusLayout';
import type { InteriorDef } from '../config/interiors';
import type { Vec2Tuple } from '../types';

/** Base-map resolution, in canvas pixels per world metre. */
const PIXELS_PER_METRE = 3;
/** Width of world shown across the minimap, in metres. */
const VIEW_METRES = 72;
const MARGIN_METRES = 30;
/** Indoors the map zooms in: rooms are metres across, not tens of metres. */
const INTERIOR_PIXELS_PER_METRE = 14;
const INTERIOR_VIEW_METRES = 20;
const INTERIOR_MARGIN_METRES = 12;

/** A pre-drawn base map and how it maps onto world metres. */
interface MapSource {
  readonly base: HTMLCanvasElement;
  readonly originX: number;
  readonly originZ: number;
  readonly pixelsPerMetre: number;
  readonly viewMetres: number;
  readonly background: string;
}
const REDRAW_INTERVAL_MS = 66;

const COLOURS = {
  lawn: '#7aa64e',
  road: '#4a4e53',
  path: '#e4cf9f',
  plaza: '#cfc8b9',
  pitch: '#5f9a3c',
  court: '#878c92',
  roof: '#b5583f',
  roofEdge: '#7d3a2a',
  hedge: '#3f7536',
  bridge: '#efe6cc',
  label: '#fdf6e3',
  labelShadow: 'rgba(20, 20, 20, 0.85)',
} as const;

/** Short names drawn on the minimap, by building id. */
const MAP_LABELS: Record<string, string> = {
  library: 'LIBRARY',
  'lecture-hall-1': 'LH1',
  'lecture-hall-2': 'LH2',
  'lecture-hall-3': 'LH3',
  'student-centre': 'STUDENT CENTRE',
  cafeteria: 'CAFETERIA',
  'hostel-a': 'HOSTEL A',
  'hostel-b': 'HOSTEL B',
  administration: 'ADMIN',
  engineering: 'ENGINEERING',
};

export class Minimap {
  private readonly originX: number;
  private readonly originZ: number;
  private readonly campus: MapSource;
  private source: MapSource;
  private readonly context: CanvasRenderingContext2D | null;
  private lastDraw = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.originX = CAMPUS_BOUNDS.minX - MARGIN_METRES;
    this.originZ = CAMPUS_BOUNDS.minZ - MARGIN_METRES;
    this.campus = {
      base: this.renderBase(),
      originX: this.originX,
      originZ: this.originZ,
      pixelsPerMetre: PIXELS_PER_METRE,
      viewMetres: VIEW_METRES,
      background: COLOURS.lawn,
    };
    this.source = this.campus;

    // Match the canvas buffer to its on-screen size, capped at 2x for memory.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.round((canvas.clientWidth || 132) * ratio);
    canvas.width = size;
    canvas.height = size;
    this.context = canvas.getContext('2d');
  }

  /** Redraws centred on the player. Cheap, and throttled unless `force`. */
  update(x: number, z: number, yaw: number, force = false, target: Vec2Tuple | null = null): void {
    const now = performance.now();
    if (!this.context || (!force && now - this.lastDraw < REDRAW_INTERVAL_MS)) {
      return;
    }
    this.lastDraw = now;

    const context = this.context;
    const size = this.canvas.width;
    const map = this.source;
    const sourceSize = map.viewMetres * map.pixelsPerMetre;
    const sourceX = (x - map.originX) * map.pixelsPerMetre - sourceSize / 2;
    const sourceY = (z - map.originZ) * map.pixelsPerMetre - sourceSize / 2;

    context.fillStyle = map.background;
    context.fillRect(0, 0, size, size);
    context.drawImage(map.base, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

    const scale = size / 132;
    if (target) {
      this.drawTarget(context, size, scale, (target[0] - x) * (size / map.viewMetres), (target[1] - z) * (size / map.viewMetres));
    }

    // Heading arrow. Screen-up is north; yaw 0 faces north, positive yaw turns
    // west (anticlockwise on screen), hence the negative rotation.
    context.save();
    context.translate(size / 2, size / 2);
    context.rotate(-yaw);
    context.beginPath();
    context.moveTo(0, -12 * scale);
    context.lineTo(8 * scale, 9 * scale);
    context.lineTo(0, 4 * scale);
    context.lineTo(-8 * scale, 9 * scale);
    context.closePath();
    context.fillStyle = '#2f9a4f';
    context.strokeStyle = '#f6d55c';
    context.lineWidth = 2 * scale;
    context.fill();
    context.stroke();
    context.restore();
  }

  /**
   * Switches to an interior's floor plan, or back to the campus with `null`.
   * The plan is drawn from the same data the interior is built from, so the
   * map and the rooms can never disagree.
   */
  setInterior(interior: InteriorDef | null): void {
    this.source = interior ? renderInteriorBase(interior) : this.campus;
    this.lastDraw = 0;
  }

  /**
   * The objective marker: a gold diamond where it is, or pinned to the rim and
   * pointing outwards when it is off the edge of the map.
   */
  private drawTarget(context: CanvasRenderingContext2D, size: number, scale: number, dx: number, dy: number): void {
    const rim = size / 2 - 9 * scale;
    const distance = Math.hypot(dx, dy);
    const outside = distance > rim;
    const px = size / 2 + (outside ? (dx / distance) * rim : dx);
    const py = size / 2 + (outside ? (dy / distance) * rim : dy);
    context.save();
    context.translate(px, py);
    if (outside) {
      context.rotate(Math.atan2(dy, dx) + Math.PI / 4);
    }
    const radius = 6 * scale;
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(radius, 0);
    context.lineTo(0, radius);
    context.lineTo(-radius, 0);
    context.closePath();
    context.fillStyle = '#f6c445';
    context.strokeStyle = '#15191a';
    context.lineWidth = 2 * scale;
    context.fill();
    context.stroke();
    context.restore();
  }

  private renderBase(): HTMLCanvasElement {
    const width = (CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + MARGIN_METRES * 2) * PIXELS_PER_METRE;
    const height = (CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ + MARGIN_METRES * 2) * PIXELS_PER_METRE;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    const context = canvas.getContext('2d');
    if (!context) {
      return canvas;
    }

    const rect = (planRectValue: PlanRect, fill: string): void => {
      const { centre, size } = planRect(planRectValue);
      context.fillStyle = fill;
      context.fillRect(
        (centre[0] - size[0] / 2 - this.originX) * PIXELS_PER_METRE,
        (centre[1] - size[1] / 2 - this.originZ) * PIXELS_PER_METRE,
        size[0] * PIXELS_PER_METRE,
        size[1] * PIXELS_PER_METRE,
      );
    };
    const toCanvas = (point: readonly [number, number]): [number, number] => {
      const [x, z] = planPoint(point);
      return [(x - this.originX) * PIXELS_PER_METRE, (z - this.originZ) * PIXELS_PER_METRE];
    };

    context.fillStyle = COLOURS.lawn;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const road of ROADS) {
      rect(road.rect, COLOURS.road);
    }
    for (const carPark of CAR_PARKS) {
      rect(carPark.rect, COLOURS.road);
    }
    for (const path of PATHS) {
      rect(path.rect, path.material === 'pavingStone' ? COLOURS.plaza : COLOURS.path);
    }
    for (const disc of ROAD_DISCS) {
      const [cx, cy] = toCanvas(disc.centre);
      context.beginPath();
      context.arc(cx, cy, planLength(disc.radiusPx) * PIXELS_PER_METRE, 0, Math.PI * 2);
      context.fillStyle = disc.material === 'asphalt' ? COLOURS.road : disc.material === 'lawn' ? COLOURS.lawn : COLOURS.plaza;
      context.fill();
    }
    rect(FOOTBALL_FIELD.surround, COLOURS.path);
    rect(FOOTBALL_FIELD.pitch, COLOURS.pitch);
    rect(BASKETBALL_COURT.court, COLOURS.court);

    context.strokeStyle = COLOURS.hedge;
    context.lineWidth = 2.5;
    for (const hedge of HEDGES) {
      const [x0, y0] = toCanvas(hedge.from);
      const [x1, y1] = toCanvas(hedge.to);
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.stroke();
    }

    for (const bridge of BRIDGES) {
      rect(bridge.rect, COLOURS.bridge);
    }
    context.lineWidth = 2;
    for (const building of BUILDINGS) {
      for (const wing of building.wings) {
        rect(wing.rect, COLOURS.roof);
        const [x0, y0] = toCanvas([wing.rect[0], wing.rect[1]]);
        const [x1, y1] = toCanvas([wing.rect[2], wing.rect[3]]);
        context.strokeStyle = COLOURS.roofEdge;
        context.strokeRect(x0, y0, x1 - x0, y1 - y0);
      }
    }

    context.font = '700 17px "Trebuchet MS", "Segoe UI", Roboto, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const building of BUILDINGS) {
      const label = MAP_LABELS[building.id];
      if (!label) {
        continue;
      }
      const xs = building.wings.flatMap((wing) => [wing.rect[0], wing.rect[2]]);
      const ys = building.wings.flatMap((wing) => [wing.rect[1], wing.rect[3]]);
      const [lx, ly] = toCanvas([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
      context.lineWidth = 4;
      context.strokeStyle = COLOURS.labelShadow;
      context.strokeText(label, lx, ly);
      context.fillStyle = COLOURS.label;
      context.fillText(label, lx, ly);
    }
    return canvas;
  }
}

/** A floor plan: rooms in their floor colours, walls dark, rooms labelled. */
function renderInteriorBase(interior: InteriorDef): MapSource {
  const [bx0, bz0, bx1, bz1] = interior.bounds;
  const originX = bx0 - INTERIOR_MARGIN_METRES;
  const originZ = bz0 - INTERIOR_MARGIN_METRES;
  const scale = INTERIOR_PIXELS_PER_METRE;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((bx1 - bx0 + INTERIOR_MARGIN_METRES * 2) * scale);
  canvas.height = Math.ceil((bz1 - bz0 + INTERIOR_MARGIN_METRES * 2) * scale);
  const context = canvas.getContext('2d');
  const background = '#2a2e2c';
  const source: MapSource = { base: canvas, originX, originZ, pixelsPerMetre: scale, viewMetres: INTERIOR_VIEW_METRES, background };
  if (!context) {
    return source;
  }
  const px = (x: number): number => (x - originX) * scale;
  const pz = (z: number): number => (z - originZ) * scale;

  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const room of interior.rooms) {
    const [x0, z0, x1, z1] = room.rect;
    context.fillStyle = room.floor === 'floorTile' ? '#c9b18a' : room.floor === 'concrete' ? '#a9a59b' : '#ddd5c4';
    context.fillRect(px(x0), pz(z0), (x1 - x0) * scale, (z1 - z0) * scale);
  }

  context.strokeStyle = '#3b4a40';
  context.lineCap = 'square';
  context.lineWidth = 0.28 * scale;
  for (const wall of interior.walls) {
    const alongX = Math.abs(wall.from[1] - wall.to[1]) < 1e-6;
    const start = Math.min(alongX ? wall.from[0] : wall.from[1], alongX ? wall.to[0] : wall.to[1]);
    const end = Math.max(alongX ? wall.from[0] : wall.from[1], alongX ? wall.to[0] : wall.to[1]);
    const fixed = alongX ? wall.from[1] : wall.from[0];
    const line = (a: number, b: number): void => {
      if (b - a < 0.01) {
        return;
      }
      context.beginPath();
      if (alongX) {
        context.moveTo(px(a), pz(fixed));
        context.lineTo(px(b), pz(fixed));
      } else {
        context.moveTo(px(fixed), pz(a));
        context.lineTo(px(fixed), pz(b));
      }
      context.stroke();
    };
    let cursor = start;
    for (const cut of [...(wall.openings ?? [])].sort((a, b) => a.at - b.at)) {
      line(cursor, cut.at - cut.width / 2);
      cursor = cut.at + cut.width / 2;
    }
    line(cursor, end);
  }

  // Closed doors as small brown ticks, so the corridor reads as a corridor.
  context.fillStyle = '#7a4f2c';
  for (const door of interior.doors) {
    const along = door.facing === 'north' || door.facing === 'south';
    const w = (along ? 0.95 : 0.25) * scale;
    const h = (along ? 0.25 : 0.95) * scale;
    context.fillRect(px(door.at[0]) - w / 2, pz(door.at[1]) - h / 2, w, h);
  }

  context.font = `700 ${Math.round(scale * 0.95)}px "Trebuchet MS", "Segoe UI", Roboto, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const room of interior.rooms) {
    if (!room.mapLabel) {
      continue;
    }
    const [x0, z0, x1, z1] = room.rect;
    context.lineWidth = 4;
    context.strokeStyle = COLOURS.labelShadow;
    context.strokeText(room.mapLabel, px((x0 + x1) / 2), pz((z0 + z1) / 2));
    context.fillStyle = COLOURS.label;
    context.fillText(room.mapLabel, px((x0 + x1) / 2), pz((z0 + z1) / 2));
  }
  return source;
}
