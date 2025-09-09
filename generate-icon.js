// Генератор якісних іконок камери для iOS
function generateCameraIcon(size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    
    // Увімкнути згладжування
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Білий фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Круглий фон з градієнтом
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#5a67d8');
    
    // Малюємо круглий фон
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Тіло камери
    const bodyWidth = size * 0.5;
    const bodyHeight = size * 0.35;
    const bodyX = (size - bodyWidth) / 2;
    const bodyY = size * 0.45;
    
    // Градієнт для тіла камери
    const bodyGradient = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY + bodyHeight);
    bodyGradient.addColorStop(0, '#444');
    bodyGradient.addColorStop(0.5, '#222');
    bodyGradient.addColorStop(1, '#111');
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    roundRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, size * 0.05);
    ctx.fill();
    
    // Об'єктив
    const lensRadius = size * 0.14;
    const lensX = size / 2;
    const lensY = bodyY + bodyHeight / 2;
    
    // Зовнішнє кільце об'єктива
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(lensX, lensY, lensRadius + size * 0.015, 0, 2 * Math.PI);
    ctx.fill();
    
    // Об'єктив
    const lensGradient = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensRadius);
    lensGradient.addColorStop(0, '#1a1a2e');
    lensGradient.addColorStop(0.5, '#16213e');
    lensGradient.addColorStop(1, '#0f1419');
    
    ctx.fillStyle = lensGradient;
    ctx.beginPath();
    ctx.arc(lensX, lensY, lensRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Відблиск на об'єктиві
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(lensX - lensRadius * 0.4, lensY - lensRadius * 0.4, lensRadius * 0.3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Спалах
    const flashSize = size * 0.04;
    const flashX = bodyX + bodyWidth * 0.8;
    const flashY = bodyY + bodyHeight * 0.3;
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(flashX, flashY, flashSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Видошукач
    const viewfinderWidth = size * 0.08;
    const viewfinderHeight = size * 0.05;
    const viewfinderX = bodyX + bodyWidth * 0.15;
    const viewfinderY = bodyY + bodyHeight * 0.25;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(viewfinderX, viewfinderY, viewfinderWidth, viewfinderHeight);
    
    return canvas.toDataURL('image/png');
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Функція для завантаження іконки
function downloadGeneratedIcon(size, filename) {
    const dataUrl = generateCameraIcon(size);
    const link = document.createElement('a');
    link.download = filename || `camera-icon-${size}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Автоматично генерувати іконки при завантаженні
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        // Генеруємо іконки тільки якщо вони не існують
        const sizes = [120, 152, 180];
        sizes.forEach(size => {
            // Перевіряємо, чи існує іконка
            const img = new Image();
            img.onerror = function() {
                // Іконка не існує або пошкоджена, генеруємо нову
                console.log(`Generating missing icon: camera-icon-${size}.png`);
                downloadGeneratedIcon(size);
            };
            img.src = `/camera-icon-${size}.png?v=check`;
        });
    });
}

// Експорт для Node.js (якщо потрібно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateCameraIcon, downloadGeneratedIcon };
}