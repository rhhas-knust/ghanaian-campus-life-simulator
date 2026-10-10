/**
 * Campus signage — the interactive objects.
 *
 * Three physical forms, all driven from `SIGNS` in the campus layout:
 *
 *   campus-board — the big twin-post welcome board inside the gate. This is the
 *                  required interactive campus sign, placed directly in the
 *                  player's line of sight at spawn.
 *   directory    — a slim single-post finger board.
 *   notice       — a glazed notice box on short legs.
 *
 * Each one registers an `Interactable`, which is all the interaction system
 * needs: it does not know or care what the sign looks like.
 */

import { Vector3 } from 'three';

import { SIGNS, type SignDef } from '../config/campusLayout';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

export function buildSignage(context: WorldBuildContext): void {
  for (const sign of SIGNS) {
    switch (sign.kind) {
      case 'campus-board':
        buildCampusBoard(context, sign);
        break;
      case 'directory':
        buildDirectory(context, sign);
        break;
      case 'notice':
        buildNoticeBox(context, sign);
        break;
    }
    registerInteractable(context, sign);
  }
}

function registerInteractable(context: WorldBuildContext, sign: SignDef): void {
  context.sink.addInteractable({
    id: `sign:${sign.id}`,
    position: new Vector3(sign.position[0], 1.6 * sign.scale, sign.position[1]),
    radius: sign.interactionRadius,
    promptLabel: sign.interaction.promptLabel,
    eyebrow: sign.interaction.eyebrow,
    title: sign.interaction.title,
    body: sign.interaction.body,
    ...(sign.interaction.bullets ? { bullets: sign.interaction.bullets } : {}),
  });
}

/** Big board on two posts, kente band across the head, board face to local +Z. */
function buildCampusBoard(context: WorldBuildContext, sign: SignDef): void {
  const s = sign.scale;
  const boardWidth = 4.6 * s;
  const boardHeight = 2.5 * s;
  const boardBase = 1.1 * s;
  const { position, rotationY } = sign;

  for (const direction of [-1, 1] as const) {
    const postCentre = offsetLocal(position, rotationY, (direction * boardWidth) / 2.6, 0);
    context.shapes.boxAt('signPost', postCentre, 0, [0.22 * s, boardBase + boardHeight, 0.22 * s], rotationY);
    context.shapes.boxAt('plinth', postCentre, 0, [0.5 * s, 0.2 * s, 0.5 * s], rotationY);
  }

  // Board face, with a gold frame behind it.
  context.shapes.boxAt(
    'kenteGold',
    position,
    boardBase,
    [boardWidth + 0.18 * s, boardHeight + 0.18 * s, 0.1 * s],
    rotationY,
  );
  context.shapes.boxAt(
    'signBoard',
    offsetLocal(position, rotationY, 0, 0.06 * s),
    boardBase + 0.09 * s,
    [boardWidth, boardHeight, 0.08 * s],
    rotationY,
  );

  // Kente header band across the top of the board.
  const bands = ['kenteRed', 'kenteGold', 'kenteGreen'] as const;
  bands.forEach((material, index) => {
    context.shapes.boxAt(
      material,
      offsetLocal(position, rotationY, 0, 0.1 * s),
      boardBase + boardHeight - (index + 1) * 0.16 * s,
      [boardWidth * 0.94, 0.16 * s, 0.06 * s],
      rotationY,
    );
  });

  // Pitched zinc hood keeping the rain off.
  context.shapes.gable('roofZinc', {
    at: offsetLocal(position, rotationY, 0, 0.1 * s),
    baseY: boardBase + boardHeight,
    width: 1.1 * s,
    depth: boardWidth + 0.5 * s,
    height: 0.4 * s,
    rotationY: rotationY + 90,
  });

  context.sink.addBoxCollider(
    `sign:${sign.id}`,
    position,
    boardWidth / 2 + 0.2,
    0.35,
    rotationY,
  );
}

/** Slim finger board on one post. */
function buildDirectory(context: WorldBuildContext, sign: SignDef): void {
  const s = sign.scale;
  const { position, rotationY } = sign;

  context.shapes.boxAt('plinth', position, 0, [0.6 * s, 0.18 * s, 0.6 * s], rotationY);
  context.shapes.cylinder('signPost', {
    at: position,
    baseY: 0.1 * s,
    radius: 0.1 * s,
    height: 2.5 * s,
    segments: 6,
    rotationY,
  });

  // Three stacked finger boards, each pointing a different way.
  const fingers = [
    { y: 2.3, rotation: 0, material: 'kenteGreen' },
    { y: 1.95, rotation: -24, material: 'kenteGold' },
    { y: 1.6, rotation: 22, material: 'kenteRed' },
  ] as const;

  for (const finger of fingers) {
    context.shapes.boxAt(
      finger.material,
      offsetLocal(position, rotationY + finger.rotation, 0.75 * s, 0),
      finger.y * s,
      [1.6 * s, 0.3 * s, 0.07 * s],
      rotationY + finger.rotation,
    );
  }

  context.sink.addCircleCollider(`sign:${sign.id}`, position, 0.4);
}

/** Glazed notice box on two short legs. */
function buildNoticeBox(context: WorldBuildContext, sign: SignDef): void {
  const s = sign.scale;
  const { position, rotationY } = sign;
  const width = 2.2 * s;
  const height = 1.5 * s;
  const base = 0.85 * s;

  for (const direction of [-1, 1] as const) {
    context.shapes.boxAt(
      'signPost',
      offsetLocal(position, rotationY, (direction * width) / 2.8, 0),
      0,
      [0.14 * s, base, 0.14 * s],
      rotationY,
    );
  }

  context.shapes.boxAt('woodDark', position, base, [width, height, 0.14 * s], rotationY);
  context.shapes.boxAt(
    'glass',
    offsetLocal(position, rotationY, 0, 0.09 * s),
    base + 0.1 * s,
    [width - 0.2 * s, height - 0.2 * s, 0.04 * s],
    rotationY,
  );
  // Paper notices behind the glass, at slight angles.
  const notices = [
    { x: -0.5, y: 0.95, rotation: 3 },
    { x: 0.42, y: 1.05, rotation: -5 },
    { x: 0.1, y: 0.5, rotation: 2 },
  ] as const;
  for (const notice of notices) {
    context.shapes.boxAt(
      'fascia',
      offsetLocal(position, rotationY, notice.x * s, 0.07 * s),
      base + notice.y * s - 0.2 * s,
      [0.52 * s, 0.4 * s, 0.02 * s],
      rotationY + notice.rotation,
    );
  }

  context.shapes.boxAt(
    'roofZinc',
    offsetLocal(position, rotationY, 0, 0.16 * s),
    base + height,
    [width + 0.2 * s, 0.1 * s, 0.5 * s],
    rotationY,
  );

  context.sink.addBoxCollider(`sign:${sign.id}`, position, width / 2 + 0.1, 0.3, rotationY);
}
