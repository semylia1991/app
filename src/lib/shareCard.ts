/**
 * shareCard.ts — generates a branded PNG card for sharing on TikTok / Instagram.
 * Uses only the native Canvas API — no extra dependencies.
 *
 * Card size: 1080×1080 px (Instagram / TikTok square format)
 */

import type { AnalysisResult } from '../services/ai';

const W = 1080;
const H = 1080;

// ── Colours (Regency palette) ─────────────────────────────────────────────────
const C = {
  bg:        '#FDFBF7',
  dark:      '#2C3E50',
  gold:      '#B89F7A',
  goldLight: '#D4C3A3',
  text:      '#4A4A4A',
  green:     '#4CAF50',
  yellow:    '#FFC107',
  red:       '#F44336',
  white:     '#FFFFFF',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(' ');
  let line = '';
  let linesDrawn = 0;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + linesDrawn * lineHeight);
      linesDrawn++;
      if (linesDrawn >= maxLines) {
        // Truncate with ellipsis
        const lastLine = ctx.measureText(line + '…').width > maxWidth ? line : line + '…';
        ctx.fillText(lastLine, x, y + (linesDrawn - 1) * lineHeight);
        return y + linesDrawn * lineHeight;
      }
      line = word;
    } else {
      line = test;
    }
  }
  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, y + linesDrawn * lineHeight);
    linesDrawn++;
  }
  return y + linesDrawn * lineHeight;
}

function statusColor(status: string): string {
  if (status === '🟢') return C.green;
  if (status === '🔴') return C.red;
  return C.yellow;
}

function statusLabel(status: string): string {
  if (status === '🟢') return '✓';
  if (status === '🔴') return '✕';
  return '!';
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateShareCard(result: AnalysisResult): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative corner lines (Regency style)
  ctx.strokeStyle = C.goldLight;
  ctx.lineWidth = 2;
  const m = 28; // margin
  const cl = 60; // corner line length
  // Top-left
  ctx.beginPath(); ctx.moveTo(m, m + cl); ctx.lineTo(m, m); ctx.lineTo(m + cl, m); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(W - m - cl, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + cl); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(m, H - m - cl); ctx.lineTo(m, H - m); ctx.lineTo(m + cl, H - m); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(W - m - cl, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - cl); ctx.stroke();

  // ── Header bar ──────────────────────────────────────────────────────────────
  ctx.fillStyle = C.dark;
  ctx.fillRect(0, 0, W, 120);

  // Brand name
  ctx.fillStyle = C.gold;
  ctx.font = '500 36px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('GlowKey AI', W / 2, 52);

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '24px Georgia, serif';
  ctx.fillText('Cosmetic Ingredient Analysis', W / 2, 92);

  // ── Product name ────────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = C.dark;
  ctx.font = 'bold 52px Georgia, serif';
  wrapText(ctx, result.productName, W / 2, 172, W - 120, 62, 2);

  // Brand
  ctx.fillStyle = C.gold;
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillText(`by ${result.brand}`, W / 2, 300);

  // Divider
  ctx.strokeStyle = C.goldLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 328); ctx.lineTo(W - 80, 328);
  ctx.stroke();

  // ── Analysis summary (1 sentence) ───────────────────────────────────────────
  const summary = result.analysis?.split('.')[0]?.trim();
  if (summary) {
    ctx.fillStyle = C.text;
    ctx.font = '28px Georgia, serif';
    ctx.textAlign = 'center';
    wrapText(ctx, summary + '.', W / 2, 364, W - 120, 40, 3);
  }

  // ── Ingredient pills ────────────────────────────────────────────────────────
  const ingredients = (result.ingredients ?? []).slice(0, 6);
  const pillH = 64;
  const pillPadX = 28;
  const pillRadius = 12;
  const pillGap = 16;
  const pillStartY = 500;

  // Layout: up to 3 per row
  const cols = Math.min(3, ingredients.length);
  const pillW = Math.floor((W - 80 - pillGap * (cols - 1)) / cols);

  ctx.font = '500 24px Arial, sans-serif';

  ingredients.forEach((ing, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const px  = 60 + col * (pillW + pillGap);
    const py  = pillStartY + row * (pillH + pillGap);

    const color = statusColor(ing.status);

    // Pill background
    roundRect(ctx, px, py, pillW, pillH, pillRadius);
    ctx.fillStyle = color + '18'; // ~10% opacity
    ctx.fill();
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Status dot
    ctx.beginPath();
    ctx.arc(px + 24, py + pillH / 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Status symbol
    ctx.fillStyle = C.white;
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusLabel(ing.status), px + 24, py + pillH / 2 + 6);

    // Ingredient name
    ctx.fillStyle = C.dark;
    ctx.font = '500 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    const maxNameW = pillW - pillPadX * 2 - 24;
    let name = ing.name;
    while (ctx.measureText(name).width > maxNameW && name.length > 4) {
      name = name.slice(0, -1);
    }
    if (name !== ing.name) name += '…';
    ctx.fillText(name, px + 44, py + pillH / 2 + 8);
  });

  // ── Legend ──────────────────────────────────────────────────────────────────
  const legendY = ingredients.length > 3 ? 780 : 680;
  const legendItems = [
    { color: C.green,  label: 'Safe' },
    { color: C.yellow, label: 'Caution' },
    { color: C.red,    label: 'Avoid' },
  ];
  const legendTotalW = legendItems.length * 160;
  const legendStartX = (W - legendTotalW) / 2;

  ctx.font = '24px Arial, sans-serif';
  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * 160;
    ctx.beginPath();
    ctx.arc(lx + 10, legendY + 10, 10, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 26, legendY + 16);
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = C.goldLight;
  ctx.fillRect(0, H - 90, W, 90);

  ctx.fillStyle = C.dark;
  ctx.font = '500 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('glowkey.ai  ·  #GlowKeyAI #SkinCare #CleanBeauty', W / 2, H - 48);

  ctx.fillStyle = C.gold;
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText('⚠ AI analysis — not medical advice', W / 2, H - 18);

  // ── Export ──────────────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}
