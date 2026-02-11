// Creates simple PNG icons without external dependencies
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// CRC32 table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  
  const combined = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(combined));
  
  return Buffer.concat([length, combined, crc]);
}

function createPNG(width, height, rgba) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // color type (RGBA)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace
  
  // IDAT chunk (image data)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type (none)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawData.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
  
  // IEND chunk
  const iend = Buffer.alloc(0);
  
  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend)
  ]);
}

function createIconPixels(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 1;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      if (dist <= radius) {
        // Create gradient from cyan to blue
        const t = dist / radius;
        
        // Background gradient
        const r = Math.round(76 * (1 - t) + 61 * t);
        const g = Math.round(201 * (1 - t) + 90 * t);
        const b = Math.round(240 * (1 - t) + 128 * t);
        
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
        
        // Draw microphone shape
        const mx = x - cx;
        const my = y - cy;
        const micWidth = size * 0.2;
        const micHeight = size * 0.4;
        
        // Microphone body (rectangle with rounded top)
        if (Math.abs(mx) < micWidth / 2 && my > -micHeight / 2 && my < micHeight / 4) {
          pixels[i] = 26;
          pixels[i + 1] = 26;
          pixels[i + 2] = 46;
          pixels[i + 3] = 255;
        }
        
        // Microphone top (circle)
        const topDist = Math.sqrt(mx ** 2 + (my + micHeight / 4) ** 2);
        if (topDist < micWidth / 2) {
          pixels[i] = 26;
          pixels[i + 1] = 26;
          pixels[i + 2] = 46;
          pixels[i + 3] = 255;
        }
        
        // Stand (arc at bottom)
        if (my > micHeight / 4 && my < micHeight / 2) {
          const arcRadius = micWidth * 0.8;
          const arcDist = Math.sqrt(mx ** 2 + (my - micHeight / 4) ** 2);
          if (Math.abs(arcDist - arcRadius) < 2 && my > micHeight / 4) {
            pixels[i] = 26;
            pixels[i + 1] = 26;
            pixels[i + 2] = 46;
            pixels[i + 3] = 255;
          }
        }
        
        // Vertical line
        if (Math.abs(mx) < 1.5 && my > micHeight / 2 - 2 && my < micHeight * 0.7) {
          pixels[i] = 26;
          pixels[i + 1] = 26;
          pixels[i + 2] = 46;
          pixels[i + 3] = 255;
        }
      } else {
        // Transparent
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 0;
      }
    }
  }
  
  return pixels;
}

// Create icons
const sizes = [16, 48, 128];

for (const size of sizes) {
  const pixels = createIconPixels(size);
  const png = createPNG(size, size, pixels);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

console.log('\nPNG icons created successfully!');
