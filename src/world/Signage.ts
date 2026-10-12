/**
 * Campus signage — the interactive objects.
 *
 *   campus-board — the welcome board inside the gate (the required campus
 *                  sign), green with gold lettering, under a red hood.
 *   finger-post  — the timber direction sign from storyboard frame 4, with
 *                  readable arms ("LIBRARY", "HOSTELS", ...).
 *   notice       — the SRC notice board outside the Student Centre.
 *
 * Lettering comes from the shared sign atlas, so it costs no extra draw calls.
 * Each sign also registers an `Interactable`, which is all the interaction
 * system needs — it does not know or care what the sign looks like.
 */

import { Vector3 } from 'three';

import { SIGNS, planPoint, type SignDef } from '../config/campusLayout';
import type { Vec2Tuple } from '../types';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';
import type { LabelStyle } from './SignAtlas';

export function buildSignage(context: WorldBuildContext): void {
  for (const sign of SIGNS) {
    const at = planPoint(sign.at);
    switch (sign.kind) {
      case 'campus-board':
        buildCampusBoard(context, sign, at);
        break;
      case 'finger-post':
        buildFingerPost(context, sign, at);
        break;
      case 'notice':
        buildNotice(context, sign, at);
        break;
    }
    context.sink.addInteractable({
      id: `sign:${sign.id}`,
      position: new Vector3(at[0], 1.6, at[1]),
      radius: sign.interactionRadius,
      promptLabel: sign.interaction.promptLabel,
      eyebrow: sign.interaction.eyebrow,
      title: sign.interaction.title,
      body: sign.interaction.body,
      ...(sign.interaction.bullets ? { bullets: sign.interaction.bullets } : {}),
    });
  }
}

/** Every label the signs need, so the atlas can be built before the world. */
export function signLabels(): { text: string; style: LabelStyle }[] {
  return SIGNS.flatMap((sign) =>
    sign.labels.map((text) => ({ text, style: styleFor(sign) })),
  );
}

function styleFor(sign: SignDef): LabelStyle {
  return sign.kind === 'campus-board' ? 'welcome' : sign.kind === 'finger-post' ? 'wood' : 'board';
}

/** A label quad on the sign's face, `out` metres in front of its centre plane. */
function faceLabel(
  context: WorldBuildContext,
  sign: SignDef,
  at: Vec2Tuple,
  text: string,
  options: { x: number; y: number; out: number; maxWidth: number; height: number; flip?: boolean },
): number {
  const cell = context.labels.cell(text, styleFor(sign));
  const width = Math.min(options.maxWidth, options.height * cell.aspect);
  const height = width / cell.aspect;
  const rotation = sign.rotationY + (options.flip ? 180 : 0);
  const centre = offsetLocal(at, sign.rotationY, options.x, options.flip ? -options.out : options.out);
  context.shapes.label('signText', [centre[0], options.y, centre[1]], width, height, rotation, cell.uv);
  return width;
}

function buildCampusBoard(context: WorldBuildContext, sign: SignDef, at: Vec2Tuple): void {
  const { shapes } = context;
  const rotation = sign.rotationY;
  const width = 4.8;
  const height = 2.4;
  const base = 1.1;

  shapes.boxAt('plinth', at, 0, [width + 0.9, 0.35, 1.2], rotation);
  for (const side of [-1, 1] as const) {
    shapes.boxAt('column', offsetLocal(at, rotation, (side * (width + 0.3)) / 2, 0), 0.35, [0.45, base + height + 0.2, 0.45], rotation);
  }
  shapes.boxAt('kenteGold', at, base, [width + 0.16, height + 0.16, 0.16], rotation);
  shapes.boxAt('kenteGreen', offsetLocal(at, rotation, 0, 0.04), base + 0.08, [width, height, 0.12], rotation);
  shapes.hipRoof('roofRed', {
    at,
    baseY: base + height + 0.45,
    width: width + 1.4,
    depth: 1.3,
    height: 0.6,
    rotationY: rotation,
  });

  const [headline, subline] = sign.labels;
  if (headline) {
    faceLabel(context, sign, at, headline, { x: 0, y: base + height * 0.66, out: 0.12, maxWidth: width - 0.4, height: 0.9 });
  }
  if (subline) {
    faceLabel(context, sign, at, subline, { x: 0, y: base + height * 0.26, out: 0.12, maxWidth: width - 0.5, height: 0.42 });
  }

  context.sink.addBoxCollider(`sign:${sign.id}`, at, (width + 0.9) / 2, 0.6, rotation);
}

function buildFingerPost(context: WorldBuildContext, sign: SignDef, at: Vec2Tuple): void {
  const { shapes } = context;
  const rotation = sign.rotationY;
  shapes.boxAt('woodWarm', at, 0, [0.2, 3.3, 0.2], rotation);
  shapes.boxAt('woodWarm', at, 3.3, [0.26, 0.1, 0.26], rotation);

  sign.labels.forEach((text, index) => {
    const y = 2.9 - index * 0.45;
    const side = index % 2 === 0 ? -1 : 1;
    const labelHeight = 0.32;
    const cell = context.labels.cell(text, 'wood');
    const armLength = Math.min(1.9, labelHeight * cell.aspect) + 0.25;
    const armX = side * (armLength / 2 + 0.1);
    shapes.boxAt('woodWarm', offsetLocal(at, rotation, armX, 0), y - 0.2, [armLength, 0.4, 0.07], rotation);
    // Lettering on both faces, so the post reads from either direction.
    for (const flip of [false, true]) {
      faceLabel(context, sign, at, text, { x: armX, y, out: 0.045, maxWidth: armLength - 0.2, height: labelHeight, flip });
    }
  });

  context.sink.addCircleCollider(`sign:${sign.id}`, at, 0.35);
}

function buildNotice(context: WorldBuildContext, sign: SignDef, at: Vec2Tuple): void {
  const { shapes } = context;
  const rotation = sign.rotationY;
  const width = 2.2;
  const base = 0.8;
  const height = 1.5;

  for (const side of [-1, 1] as const) {
    shapes.boxAt('woodWarm', offsetLocal(at, rotation, (side * width) / 2.6, 0), 0, [0.12, base, 0.12], rotation);
  }
  shapes.boxAt('woodWarm', at, base, [width, height, 0.12], rotation);
  shapes.boxAt('canvasWhite', offsetLocal(at, rotation, -0.45, 0.07), base + 0.35, [0.5, 0.6, 0.02], rotation + 3);
  shapes.boxAt('canvasWhite', offsetLocal(at, rotation, 0.4, 0.07), base + 0.25, [0.55, 0.45, 0.02], rotation - 4);
  shapes.boxAt('roofRed', offsetLocal(at, rotation, 0, 0.12), base + height + 0.3, [width + 0.3, 0.1, 0.5], rotation);

  const [header] = sign.labels;
  if (header) {
    faceLabel(context, sign, at, header, { x: 0, y: base + height + 0.08, out: 0.08, maxWidth: width - 0.2, height: 0.3 });
  }

  context.sink.addBoxCollider(`sign:${sign.id}`, at, width / 2 + 0.1, 0.3, rotation);
}
