// Generates PWA PNG icons from the WarRoom flame mark.
// Run: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const GRADIENT = `
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ef4444"/>
    <stop offset="100%" stop-color="#f97316"/>
  </linearGradient>
  <linearGradient id="g2" x1="0.5" y1="0.4" x2="0.5" y2="0.65">
    <stop offset="0%" stop-color="#fbbf24"/>
    <stop offset="100%" stop-color="#f97316"/>
  </linearGradient>`;

// Flame path drawn in a 32x32 coordinate space.
const FLAME = `
  <path d="M16 5C13.5 10.5 9 13 9 18.5a7 7 0 0014 0c0-2.5-1-5-2.5-6.5-0.5 2.5-1.5 4-3 4.5C19 13 19 9 16 5z" fill="white" opacity="0.95"/>
  <path d="M16 12C15 14.5 13.5 15.5 13.5 17.5a2.5 2.5 0 005 0c0-1-0.5-2-1-2.5-0.2 1-0.6 1.5-1 1.5C16.5 15.5 16.5 14 16 12z" fill="url(#g2)" opacity="0.7"/>`;

// Standard icon: rounded-rect gradient tile + flame, edge to edge.
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>${GRADIENT}</defs>
  <rect width="32" height="32" rx="7" fill="url(#g)"/>
  ${FLAME}
</svg>`;

// Maskable icon: full-bleed gradient square (no rounded corners), flame scaled
// to ~70% and centred so it sits inside the maskable safe zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>${GRADIENT}</defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <g transform="translate(4.8 4.8) scale(0.7)">${FLAME}</g>
</svg>`;

await mkdir('public', { recursive: true });

const render = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${file}`);

await render(standardSvg, 192, 'icon-192.png');
await render(standardSvg, 512, 'icon-512.png');
await render(maskableSvg, 512, 'icon-maskable-512.png');
await render(standardSvg, 180, 'apple-touch-icon.png');

console.log('PWA icons generated in public/.');
