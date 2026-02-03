#!/usr/bin/env node

/**
 * Create placeholder PNG files for PWA icons
 * These are minimal valid PNG files that can be replaced with proper designs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

/**
 * Create a minimal valid PNG file
 * Size: small placeholder with theme colors
 */
function createMinimalPNG(size) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Create IHDR chunk (image header)
  const width = size;
  const height = size;

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  const ihdr = createChunk('IHDR', ihdrData);

  // Create IDAT chunk (image data)
  // Create a simple image with the theme colors
  const pixelData = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;

  // Theme colors: dark background #101922 and bright theme #137fec
  const bgColor = [0x10, 0x19, 0x22];
  const themeColor = [0x13, 0x7f, 0xec];

  for (let y = 0; y < height; y++) {
    pixelData[offset++] = 0; // filter type for this scanline

    for (let x = 0; x < width; x++) {
      // Create a simple circular gradient
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = Math.sqrt(cx * cx + cy * cy);
      const ratio = Math.min(distance / maxDistance, 1);

      let color;
      if (ratio < 0.6) {
        // Inner circle - theme color
        color = themeColor;
      } else if (ratio < 0.7) {
        // Border - interpolate
        color = [
          Math.round(bgColor[0] + (themeColor[0] - bgColor[0]) * (1 - ratio)),
          Math.round(bgColor[1] + (themeColor[1] - bgColor[1]) * (1 - ratio)),
          Math.round(bgColor[2] + (themeColor[2] - bgColor[2]) * (1 - ratio))
        ];
      } else {
        // Outer - background
        color = bgColor;
      }

      pixelData[offset++] = color[0];
      pixelData[offset++] = color[1];
      pixelData[offset++] = color[2];
    }
  }

  const compressedData = zlib.deflateSync(pixelData);
  const idat = createChunk('IDAT', compressedData);

  // Create IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  const png = Buffer.concat([signature, ihdr, idat, iend]);
  return png;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  // Simple CRC32 implementation
  const crc = calculateCRC32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC32(data) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Creating placeholder PNG icons...');
sizes.forEach((size) => {
  const png = createMinimalPNG(size);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: icon-${size}x${size}.png`);
});

// Create screenshot placeholders (larger sizes)
const screenshotSizes = [
  { width: 540, height: 720, name: 'screenshot-540x720' },
  { width: 1280, height: 720, name: 'screenshot-1280x720' }
];

console.log('\nCreating screenshot placeholders...');
screenshotSizes.forEach(({ width, height, name }) => {
  // For screenshots, just use a simple solid color placeholder
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);

  // Create simple gradient data
  const pixelData = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;

  const color = [0x13, 0x7f, 0xec]; // Theme color

  for (let y = 0; y < height; y++) {
    pixelData[offset++] = 0;
    for (let x = 0; x < width; x++) {
      pixelData[offset++] = color[0];
      pixelData[offset++] = color[1];
      pixelData[offset++] = color[2];
    }
  }

  const compressedData = zlib.deflateSync(pixelData);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  const filePath = path.join(iconsDir, `${name}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created: ${name}.png (${width}x${height})`);
});

console.log('\nAll placeholder PNGs created successfully!');
console.log('You can replace these with proper icon designs later.');
