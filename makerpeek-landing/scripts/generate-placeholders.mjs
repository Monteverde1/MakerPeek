#!/usr/bin/env node
/** Regenerate cream + forest-bordered placeholder PNGs (no font deps). */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CREAM = '#FBF7F2';
const FOREST = '#3D5944';

const files = [
  ['hero-shot.png', 600, 1000],
  ['hero-panel.png', 720, 540],
  ['step-1.png', 480, 360],
  ['step-2.png', 480, 360],
  ['step-3.png', 480, 360],
  ['feature-overview.png', 640, 480],
  ['feature-activity.png', 640, 480],
  ['feature-maturity.png', 640, 480],
  ['feature-profile.png', 640, 480],
  ['feature-appstack.png', 640, 480],
  ['change-monitor.png', 720, 400],
  ['og-image.png', 1200, 630],
];

for (const [name, w, h] of files) {
  const out = join(dir, name);
  execSync(
    `magick -size ${w}x${h} xc:${CREAM} -strokewidth 3 -stroke ${FOREST} -fill none -draw "rectangle 4,4 ${w - 5},${h - 5}" "${out}"`,
    { stdio: 'inherit' },
  );
}
console.log(`Wrote ${files.length} placeholders to ${dir}`);
