const fs = require('fs');
const { createCanvas } = require('canvas');

// Створюємо іконку 180x180
const canvas = createCanvas(180, 180);
const ctx = canvas.getContext('2d');

// Фон з градієнтом
const gradient = ctx.createLinearGradient(0, 0, 180, 180);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(1, '#764ba2');

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 180, 180);

// Тіло камери (білий прямокутник)
ctx.fillStyle = '#ffffff';
ctx.roundRect(35, 55, 110, 80, 10);
ctx.fill();

// Об'єктив (зовнішній)
ctx.beginPath();
ctx.arc(90, 95, 28, 0, 2 * Math.PI);
ctx.fillStyle = '#333333';
ctx.fill();

// Об'єктив (внутрішній)
ctx.beginPath();
ctx.arc(90, 95, 18, 0, 2 * Math.PI);
ctx.fillStyle = '#666666';
ctx.fill();

// Центр об'єктива
ctx.beginPath();
ctx.arc(90, 95, 8, 0, 2 * Math.PI);
ctx.fillStyle = '#444444';
ctx.fill();

// Спалах
ctx.fillStyle = '#ffffff';
ctx.roundRect(115, 40, 20, 12, 3);
ctx.fill();

// Кнопка спуску
ctx.beginPath();
ctx.arc(130, 70, 6, 0, 2 * Math.PI);
ctx.fillStyle = '#ff6b6b';
ctx.fill();

// Візир
ctx.fillStyle = '#cccccc';
ctx.roundRect(50, 40, 15, 8, 2);
ctx.fill();

// Збереження файлу
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('camera-icon-180.png', buffer);

console.log('✅ Іконка camera-icon-180.png створена!');
