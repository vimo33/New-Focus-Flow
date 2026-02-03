#!/usr/bin/env node

/**
 * Generate PWA icons from base SVG
 * Run with: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, '../public/icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a placeholder PNG using node canvas or ffmpeg if available
function generatePlaceholderIcon(size) {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);

  // Try using ImageMagick if available
  try {
    const svgPath = path.join(iconsDir, 'icon-base.svg');
    execSync(`convert ${svgPath} -resize ${size}x${size} -background "#101922" -gravity center -extent ${size}x${size} ${iconPath}`, {
      stdio: 'pipe'
    });
    console.log(`Generated icon: ${size}x${size}`);
  } catch (e) {
    // If ImageMagick not available, create a simple PNG programmatically
    console.warn(`Warning: ImageMagick not available. Creating placeholder for ${size}x${size}`);
    createSimplePNG(iconPath, size);
  }
}

function createSimplePNG(filePath, size) {
  // Create a simple valid PNG manually
  // This is a minimal 1x1 PNG that we can scale
  // For now, we'll create placeholder files that can be converted later

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
  const ihdr = Buffer.from([
    0, 0, 0, 13, // Length
    73, 72, 68, 82, // "IHDR"
    0, 0, 0, 1, // Width: 1
    0, 0, 0, 1, // Height: 1
    8, 2, 0, 0, 0, // Bit depth, color type, compression, filter, interlace
    144, 119, 83, 222 // CRC
  ]);

  const idat = Buffer.from([
    0, 0, 0, 13,
    73, 68, 65, 84,
    8, 29, 1, 0, 0, 255, 255, 0, 0, 0, 1, 0, 1,
    80, 191, 196, 178
  ]);

  const iend = Buffer.from([
    0, 0, 0, 0,
    73, 69, 78, 68,
    174, 66, 96, 130
  ]);

  const png = Buffer.concat([header, ihdr, idat, iend]);
  fs.writeFileSync(filePath, png);
  console.log(`Created placeholder PNG: ${filePath}`);
}

// Generate all icon sizes
console.log('Generating PWA icons...');
sizes.forEach(size => {
  generatePlaceholderIcon(size);
});

// Generate screenshot placeholders
const screenshotSizes = [
  { size: '540x720', name: 'screenshot-540x720' },
  { size: '1280x720', name: 'screenshot-1280x720' }
];

screenshotSizes.forEach(({ size, name }) => {
  try {
    const svgPath = path.join(iconsDir, 'icon-base.svg');
    const screenshotPath = path.join(iconsDir, `${name}.png`);
    execSync(`convert ${svgPath} -resize ${size} -background "#101922" -gravity center -extent ${size} ${screenshotPath}`, {
      stdio: 'pipe'
    });
    console.log(`Generated screenshot: ${size}`);
  } catch (e) {
    console.warn(`Warning: Could not generate screenshot ${size}`);
  }
});

console.log('Icon generation complete!');
