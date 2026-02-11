// Simple script to create placeholder icons
// Run with: node scripts/create-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Simple 1x1 PNG in different colors (placeholder)
// In production, replace with actual icons
function createPlaceholderPng(size) {
  // This creates a simple colored square PNG
  // For a real project, use proper icon files
  
  // PNG header and IHDR chunk for a simple colored image
  const width = size;
  const height = size;
  
  // Create a simple PNG with a microphone-like pattern
  // Using raw PNG creation (simplified)
  
  // For now, we'll create a very basic placeholder
  // Real icons should be designed properly
  
  const canvas = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      // Create a circular gradient pattern
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const maxDist = width / 2;
      
      if (dist < maxDist * 0.7) {
        // Inner circle - cyan color
        row.push([76, 201, 240, 255]); // #4cc9f0
      } else if (dist < maxDist) {
        // Border
        row.push([26, 26, 46, 255]); // #1a1a2e
      } else {
        // Transparent
        row.push([0, 0, 0, 0]);
      }
    }
    canvas.push(row);
  }
  
  return canvas;
}

// Since we can't easily create PNGs without libraries,
// let's create SVG files that can be converted
function createSvgIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4cc9f0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3d5a80;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="url(#grad)" stroke="#1a1a2e" stroke-width="1"/>
  <g fill="#1a1a2e" transform="translate(${size/2}, ${size/2}) scale(${size/48})">
    <!-- Microphone icon -->
    <rect x="-4" y="-12" width="8" height="16" rx="4"/>
    <path d="M-8 0 Q-8 8 0 10 Q8 8 8 0" fill="none" stroke="#1a1a2e" stroke-width="2"/>
    <line x1="0" y1="10" x2="0" y2="14" stroke="#1a1a2e" stroke-width="2"/>
    <line x1="-4" y1="14" x2="4" y2="14" stroke="#1a1a2e" stroke-width="2"/>
  </g>
</svg>`;
}

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons (can be converted to PNG using browser or ImageMagick)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created ${svgPath}`);
});

console.log('\nSVG icons created. To convert to PNG:');
console.log('1. Open each SVG in a browser and save as PNG');
console.log('2. Or use ImageMagick: convert icon48.svg icon48.png');
console.log('3. Or use an online converter');
