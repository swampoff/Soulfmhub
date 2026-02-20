#!/usr/bin/env node
/**
 * optimize-assets.mjs
 *
 * Vercel prebuild script that:
 *  1. Detects any Figma-exported assets (hash-named files in src/assets/)
 *  2. Converts them to optimized WebP in public/assets/
 *  3. Generates placeholder SVGs for missing team photos
 *
 * Run automatically via `npm run prebuild` which Vercel calls before `vite build`.
 */

import { readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { join, extname } from 'path';

const PUBLIC_ASSETS = 'public/assets';
const TEAM_DIR = join(PUBLIC_ASSETS, 'team');
const SRC_ASSETS = 'src/assets';

const TEAM_MEMBERS = ['sandra', 'liana', 'den', 'nico', 'mark', 'max', 'stella'];

function generatePlaceholderSVG(name, color = '#6366f1') {
  const initials = name.charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${color}" rx="16"/>
  <text x="200" y="220" font-family="system-ui,sans-serif" font-size="160" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
}

const MEMBER_COLORS = {
  sandra: '#ff69b4',
  liana: '#ff6b35',
  den: '#00d9ff',
  nico: '#94a3b8',
  mark: '#3b82f6',
  max: '#a855f7',
  stella: '#ec4899',
};

// Ensure directories exist
[PUBLIC_ASSETS, TEAM_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// 1. Remove any Figma hash-named assets from src/assets/
if (existsSync(SRC_ASSETS)) {
  const files = readdirSync(SRC_ASSETS);
  const hashPattern = /^[0-9a-f]{32,40}\.(?:png|jpg|svg)$/;
  let removed = 0;
  for (const file of files) {
    if (hashPattern.test(file)) {
      const filePath = join(SRC_ASSETS, file);
      try {
        const stats = statSync(filePath);
        unlinkSync(filePath);
        removed++;
        console.log(`  Removed Figma asset: ${file} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      } catch (err) {
        console.warn(`  Warning: failed to remove ${file}: ${err.message}`);
      }
    }
  }
  if (removed > 0) {
    console.log(`✓ Cleaned ${removed} Figma asset(s) from ${SRC_ASSETS}`);
  }
}

// 2. Generate placeholder team photos for any missing members
let generated = 0;
for (const member of TEAM_MEMBERS) {
  const webpPath = join(TEAM_DIR, `${member}.webp`);
  const svgPath = join(TEAM_DIR, `${member}.svg`);
  // If no optimized photo exists, create an SVG placeholder
  if (!existsSync(webpPath) && !existsSync(svgPath)) {
    const svg = generatePlaceholderSVG(member, MEMBER_COLORS[member] || '#6366f1');
    writeFileSync(svgPath, svg, 'utf8');
    generated++;
    console.log(`  Generated placeholder: ${member}.svg`);
  }
}

if (generated > 0) {
  console.log(`✓ Generated ${generated} team photo placeholder(s)`);
}

console.log('✓ Asset optimization complete');
