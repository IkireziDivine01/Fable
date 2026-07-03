import * as THREE from 'three';
import type { RhubarbViseme } from '../types';
import type { ResolvedCharacterConfig } from './config';

const FACE_SIZE = 256;

export interface FaceDrawState {
  viseme: RhubarbViseme;
  blinking: boolean;
}

type MouthPathFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Rhubarb viseme → canvas mouth shape (first pass, visually distinct) */
export const mouthPaths: Record<RhubarbViseme, MouthPathFn> = {
  /** Wide open — CDGKNRSTXYZ */
  A: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.fillStyle = '#4a2018';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.18, h * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b4040';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.02, w * 0.12, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Closed lips — MBP */
  B: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, cy);
    ctx.quadraticCurveTo(cx, cy - h * 0.02, cx + w * 0.12, cy);
    ctx.quadraticCurveTo(cx, cy + h * 0.02, cx - w * 0.12, cy);
    ctx.fill();
  },
  /** Slight open — E */
  C: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.11, h * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Wide smile — AI */
  D: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.14, cy - h * 0.01);
    ctx.quadraticCurveTo(cx, cy + h * 0.08, cx + w * 0.14, cy - h * 0.01);
    ctx.quadraticCurveTo(cx, cy + h * 0.025, cx - w * 0.14, cy - h * 0.01);
    ctx.fill();
  },
  /** Rounded O */
  E: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.1, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Pursed U */
  F: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.065, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  /** FV — upper teeth on lower lip */
  G: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.fillStyle = '#f5f0eb';
    ctx.fillRect(cx - w * 0.09, cy - h * 0.035, w * 0.18, h * 0.025);
    ctx.fillStyle = '#6b3a2a';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, cy + h * 0.02);
    ctx.quadraticCurveTo(cx, cy + h * 0.045, cx + w * 0.1, cy + h * 0.02);
    ctx.quadraticCurveTo(cx, cy + h * 0.005, cx - w * 0.1, cy + h * 0.02);
    ctx.fill();
  },
  /** L — tongue tip */
  H: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.09, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d47777';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.02, w * 0.045, h * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Rest / neutral closed */
  X: (ctx, w, h) => {
    const cx = w / 2;
    const cy = h * 0.74;
    ctx.fillStyle = '#6b3a2a';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, cy);
    ctx.quadraticCurveTo(cx, cy + h * 0.015, cx + w * 0.1, cy);
    ctx.quadraticCurveTo(cx, cy - h * 0.008, cx - w * 0.1, cy);
    ctx.fill();
  },
};

function drawFaceBase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skinColor: string
) {
  const cx = w / 2;
  const cy = h * 0.48;
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.42, h * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  eyeColor: string,
  blinking: boolean
) {
  const eyeY = h * 0.4;
  const eyeSpacing = w * 0.19;
  const cx = w / 2;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSpacing;

    if (blinking) {
      ctx.strokeStyle = '#1e1b18';
      ctx.lineWidth = h * 0.022;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - w * 0.065, eyeY);
      ctx.quadraticCurveTo(ex, eyeY - h * 0.012, ex + w * 0.065, eyeY);
      ctx.stroke();
      continue;
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, w * 0.072, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e1b18';
    ctx.lineWidth = h * 0.008;
    ctx.stroke();

    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + h * 0.008, w * 0.038, h * 0.042, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex + w * 0.016, eyeY - h * 0.01, w * 0.014, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBrows(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const browY = h * 0.29;
  const spacing = w * 0.19;
  const cx = w / 2;

  ctx.strokeStyle = '#1e1b18';
  ctx.lineWidth = h * 0.016;
  ctx.lineCap = 'round';

  for (const side of [-1, 1]) {
    const bx = cx + side * spacing;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.065, browY + side * h * 0.01);
    ctx.quadraticCurveTo(bx, browY - h * 0.022, bx + w * 0.065, browY);
    ctx.stroke();
  }
}

function drawCheeks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: ResolvedCharacterConfig
) {
  if (!config.hasBlush) return;

  const cx = w / 2;
  const cheekY = h * 0.52;
  ctx.fillStyle = config.blushColor;

  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * w * 0.22, cheekY, w * 0.06, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  viseme: RhubarbViseme
) {
  ctx.fillStyle = '#6b3a2a';
  mouthPaths[viseme](ctx, w, h);
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  config: ResolvedCharacterConfig,
  state: FaceDrawState
) {
  const w = FACE_SIZE;
  const h = FACE_SIZE;

  ctx.clearRect(0, 0, w, h);
  drawFaceBase(ctx, w, h, config.skinColor);
  drawBrows(ctx, w, h);
  drawEyes(ctx, w, h, config.eyeColor, state.blinking);
  drawCheeks(ctx, w, h, config);
  drawMouth(ctx, w, h, state.viseme);
}

export interface FaceTextureHandle {
  texture: THREE.CanvasTexture;
  redraw: (config: ResolvedCharacterConfig, state: FaceDrawState) => boolean;
  dispose: () => void;
}

/** Create a reusable canvas face texture; only marks needsUpdate when state changes */
export function createFaceTextureHandle(): FaceTextureHandle {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_SIZE;
  canvas.height = FACE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  let lastViseme: RhubarbViseme | null = null;
  let lastBlinking: boolean | null = null;
  let lastSkinColor: string | null = null;

  const redraw = (config: ResolvedCharacterConfig, state: FaceDrawState): boolean => {
    if (
      state.viseme === lastViseme &&
      state.blinking === lastBlinking &&
      config.skinColor === lastSkinColor
    ) {
      return false;
    }
    lastViseme = state.viseme;
    lastBlinking = state.blinking;
    lastSkinColor = config.skinColor;
    drawFace(ctx, config, state);
    texture.needsUpdate = true;
    return true;
  };

  return {
    texture,
    redraw,
    dispose: () => texture.dispose(),
  };
}

/** One-shot helper — prefer createFaceTextureHandle for animated characters */
export function buildFaceTexture(
  config: ResolvedCharacterConfig,
  mouthShape: RhubarbViseme,
  blinking = false
): THREE.CanvasTexture {
  const handle = createFaceTextureHandle();
  handle.redraw(config, { viseme: mouthShape, blinking });
  return handle.texture;
}

/** Map legacy / stored mouth shapes to Rhubarb visemes */
export function normalizeViseme(shape: string): RhubarbViseme {
  switch (shape) {
    case 'A':
    case 'B':
    case 'C':
    case 'D':
    case 'E':
    case 'F':
    case 'G':
    case 'H':
    case 'X':
      return shape;
    case 'closed':
      return 'X';
    case 'small':
      return 'C';
    case 'medium':
      return 'E';
    case 'wide':
      return 'A';
    default:
      return 'X';
  }
}

/** Random blink interval in ms (slightly varied per character) */
export function nextBlinkDelay(seed = 0): number {
  const base = 2800 + (seed % 5) * 400;
  return base + Math.random() * 1800;
}

export const BLINK_DURATION_MS = 120;
