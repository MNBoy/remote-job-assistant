const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons and convert to PNG
const sizes = [16, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    // Generate the SVG content
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size / 8}" fill="#4F46E5"/>
  <path d="M${size * 0.25} ${size * 0.5}L${size * 0.4} ${size * 0.65}L${
      size * 0.75
    } ${size * 0.35}" stroke="white" stroke-width="${
      size / 16
    }" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

    // Save SVG (useful for development)
    fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);

    // Convert SVG to PNG using sharp
    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(iconsDir, `icon${size}.png`));
      console.log(`Created icon${size}.png`);
    } catch (err) {
      console.error(`Error creating icon${size}.png:`, err);
    }
  }

  console.log('Icons created successfully!');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
