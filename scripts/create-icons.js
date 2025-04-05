const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for the extension
const sizes = [16, 48, 128];

sizes.forEach((size) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size / 8}" fill="#4F46E5"/>
    <path d="M${size * 0.25} ${size * 0.5}L${size * 0.4} ${size * 0.65}L${
    size * 0.75
  } ${size * 0.35}" stroke="white" stroke-width="${
    size / 16
  }" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});

console.log('Icons created successfully!');
console.log(
  'Note: For production, you should convert these to .png files or use proper icons.'
);
