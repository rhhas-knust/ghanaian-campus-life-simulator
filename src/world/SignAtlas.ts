/**
 * Sign lettering, packed into ONE texture.
 *
 * Phase 1 originally left every sign blank, because a texture per sign is a
 * material — and therefore a draw call — per sign. Instead, every piece of
 * lettering on campus ("LIBRARY", "HASTECH HOSTELS", the signpost arms) is drawn
 * once into a shared canvas at load time. Each sign is then a quad whose UVs
 * point at its own cell, and all of them batch into a single mesh.
 *
 * Nothing is downloaded: the text is rendered with the browser's own fonts.
 */

import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

export type LabelStyle = 'board' | 'wood' | 'welcome';

interface Cell {
  readonly uv: readonly [number, number, number, number];
  /** Width / height of the drawn cell, so quads are never stretched. */
  readonly aspect: number;
}

const ATLAS_WIDTH = 1024;
const CELL_HEIGHT = 72;
const PADDING = 6;

const STYLES: Record<LabelStyle, { background: string; text: string; border: string }> = {
  // Cream board, green lettering — the "LIBRARY" and "HASTECH HOSTELS" signs.
  board: { background: '#efe6cc', text: '#2f6b45', border: '#4e7a55' },
  // Varnished timber, cream lettering — the finger-post arms.
  wood: { background: '#9c6a3c', text: '#f7ecd2', border: '#6e4524' },
  // Dark green, gold lettering — the welcome board at the gate.
  welcome: { background: '#1f5a3a', text: '#f6d55c', border: '#f6d55c' },
};

export class SignAtlas {
  readonly texture: CanvasTexture;
  private readonly cells = new Map<string, Cell>();

  constructor(entries: readonly { readonly text: string; readonly style: LabelStyle }[]) {
    const unique = new Map<string, { text: string; style: LabelStyle }>();
    for (const entry of entries) {
      unique.set(SignAtlas.key(entry.text, entry.style), { text: entry.text, style: entry.style });
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('SignAtlas: 2D canvas is unavailable');
    }
    const font = `700 ${Math.round(CELL_HEIGHT * 0.56)}px "Trebuchet MS", "Segoe UI", Roboto, sans-serif`;
    context.font = font;

    // Pack left to right, wrapping into rows.
    const placements: { key: string; text: string; style: LabelStyle; x: number; y: number; w: number }[] = [];
    let cursorX = 0;
    let cursorY = 0;
    for (const [key, entry] of unique) {
      const width = Math.min(ATLAS_WIDTH, Math.ceil(context.measureText(entry.text).width) + CELL_HEIGHT * 0.7);
      if (cursorX + width > ATLAS_WIDTH) {
        cursorX = 0;
        cursorY += CELL_HEIGHT + PADDING;
      }
      placements.push({ key, text: entry.text, style: entry.style, x: cursorX, y: cursorY, w: width });
      cursorX += width + PADDING;
    }

    // Power-of-two height keeps mipmapping happy on older mobile GPUs.
    const usedHeight = cursorY + CELL_HEIGHT;
    let height = 64;
    while (height < usedHeight) {
      height *= 2;
    }
    canvas.width = ATLAS_WIDTH;
    canvas.height = height;
    context.font = font; // resizing a canvas resets its state
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (const placement of placements) {
      const style = STYLES[placement.style];
      context.fillStyle = style.border;
      context.fillRect(placement.x, placement.y, placement.w, CELL_HEIGHT);
      context.fillStyle = style.background;
      context.fillRect(placement.x + 4, placement.y + 4, placement.w - 8, CELL_HEIGHT - 8);
      context.fillStyle = style.text;
      context.fillText(placement.text, placement.x + placement.w / 2, placement.y + CELL_HEIGHT / 2 + 2);

      // Canvas y runs down, texture v runs up.
      this.cells.set(placement.key, {
        uv: [
          placement.x / ATLAS_WIDTH,
          1 - (placement.y + CELL_HEIGHT) / height,
          (placement.x + placement.w) / ATLAS_WIDTH,
          1 - placement.y / height,
        ],
        aspect: placement.w / CELL_HEIGHT,
      });
    }

    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearMipmapLinearFilter;
    this.texture.anisotropy = 2;
  }

  /** The UV rectangle and aspect ratio for a label. Throws if it was never registered. */
  cell(text: string, style: LabelStyle): Cell {
    const cell = this.cells.get(SignAtlas.key(text, style));
    if (!cell) {
      throw new Error(`SignAtlas: label "${text}" (${style}) was not registered`);
    }
    return cell;
  }

  dispose(): void {
    this.texture.dispose();
  }

  private static key(text: string, style: LabelStyle): string {
    return `${style}:${text}`;
  }
}
