const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#89f7fe');
  gradient.addColorStop(1, '#66a6ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw multiple shapes to represent the game
  const centerX = size / 2;
  const centerY = size / 2;
  const shapeSize = size * 0.25;

  // Circle
  const circleGradient = ctx.createRadialGradient(
    centerX - shapeSize * 0.6, centerY - shapeSize * 0.4, 0,
    centerX - shapeSize * 0.6, centerY - shapeSize * 0.4, shapeSize * 0.4
  );
  circleGradient.addColorStop(0, '#fff');
  circleGradient.addColorStop(0.5, '#ff6b9d');
  circleGradient.addColorStop(1, '#c44569');
  ctx.fillStyle = circleGradient;
  ctx.shadowColor = '#ff6b9d';
  ctx.shadowBlur = size * 0.03;
  ctx.beginPath();
  ctx.arc(centerX - shapeSize * 0.6, centerY - shapeSize * 0.4, shapeSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Triangle
  const triGradient = ctx.createRadialGradient(
    centerX + shapeSize * 0.5, centerY - shapeSize * 0.3, 0,
    centerX + shapeSize * 0.5, centerY - shapeSize * 0.3, shapeSize * 0.45
  );
  triGradient.addColorStop(0, '#fff');
  triGradient.addColorStop(0.5, '#ffd166');
  triGradient.addColorStop(1, '#f77f00');
  ctx.fillStyle = triGradient;
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = size * 0.03;
  ctx.beginPath();
  const triSize = shapeSize * 0.5;
  ctx.moveTo(centerX + shapeSize * 0.5, centerY - shapeSize * 0.7);
  ctx.lineTo(centerX + shapeSize * 0.9, centerY + shapeSize * 0.1);
  ctx.lineTo(centerX + shapeSize * 0.1, centerY + shapeSize * 0.1);
  ctx.closePath();
  ctx.fill();

  // Square
  const sqGradient = ctx.createRadialGradient(
    centerX - shapeSize * 0.1, centerY + shapeSize * 0.6, 0,
    centerX - shapeSize * 0.1, centerY + shapeSize * 0.6, shapeSize * 0.5
  );
  sqGradient.addColorStop(0, '#fff');
  sqGradient.addColorStop(0.5, '#06d6a0');
  sqGradient.addColorStop(1, '#118ab2');
  ctx.fillStyle = sqGradient;
  ctx.shadowColor = '#06d6a0';
  ctx.shadowBlur = size * 0.03;
  ctx.fillRect(
    centerX - shapeSize * 0.5,
    centerY + shapeSize * 0.3,
    shapeSize * 0.8,
    shapeSize * 0.8
  );

  // Pentagon (star-like)
  const pentGradient = ctx.createRadialGradient(
    centerX + shapeSize * 0.6, centerY + shapeSize * 0.5, 0,
    centerX + shapeSize * 0.6, centerY + shapeSize * 0.5, shapeSize * 0.4
  );
  pentGradient.addColorStop(0, '#fff');
  pentGradient.addColorStop(0.5, '#b5179e');
  pentGradient.addColorStop(1, '#7209b7');
  ctx.fillStyle = pentGradient;
  ctx.shadowColor = '#b5179e';
  ctx.shadowBlur = size * 0.03;
  ctx.beginPath();
  const pentSize = shapeSize * 0.35;
  const pentX = centerX + shapeSize * 0.6;
  const pentY = centerY + shapeSize * 0.5;
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = pentX + Math.cos(angle) * pentSize;
    const y = pentY + Math.sin(angle) * pentSize;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// Generate and save icons
const icon192 = generateIcon(192);
const icon512 = generateIcon(512);

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

fs.writeFileSync(path.join(assetsDir, 'icon-192.png'), icon192.toBuffer('image/png'));
fs.writeFileSync(path.join(assetsDir, 'icon-512.png'), icon512.toBuffer('image/png'));

console.log('✅ Icons generated successfully!');
console.log('   - assets/icon-192.png');
console.log('   - assets/icon-512.png');
