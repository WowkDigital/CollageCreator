export async function renderCollage(images, highRes = false, canvas, ctx, inputs) {
    if (images.length === 0) return;

    const layoutMode = document.querySelector('input[name="layout"]:checked').value;
    const count = parseInt(inputs.colCount.value);
    const gap = parseInt(inputs.gapSize.value);
    const radius = parseInt(inputs.radiusSize.value);
    const baseWidth = parseInt(inputs.canvasWidth.value) || 2000;
    const bg = inputs.bgColor.value;
    const gridWeight = parseInt(inputs.gridWeight.value) || 0;
    const gridColor = inputs.gridColor.value;

    let positions = []; 
    let finalHeight = 0;

    if (layoutMode === 'masonry') {
        const colWidth = (baseWidth - (gap * (count + 1))) / count;
        let colHeights = new Array(count).fill(gap);
        images.forEach(imgObj => {
            const img = highRes ? imgObj.original : imgObj.thumb;
            const minColIndex = colHeights.indexOf(Math.min(...colHeights));
            const x = gap + (minColIndex * (colWidth + gap));
            const y = colHeights[minColIndex];
            
            const aspectRatio = img.naturalHeight / img.naturalWidth;
            const h = colWidth * aspectRatio;

            positions.push({ img, x, y, w: colWidth, h, crop: false });
            colHeights[minColIndex] += h + gap;
        });
        finalHeight = Math.max(...colHeights);

    } else if (layoutMode === 'grid') {
        const colWidth = (baseWidth - (gap * (count + 1))) / count;
        const rowHeight = colWidth;
        images.forEach((imgObj, i) => {
            const img = highRes ? imgObj.original : imgObj.thumb;
            const colIndex = i % count;
            const rowIndex = Math.floor(i / count);
            
            const x = gap + (colIndex * (colWidth + gap));
            const y = gap + (rowIndex * (rowHeight + gap));
            
            positions.push({ img, x, y, w: colWidth, h: rowHeight, crop: true });
            finalHeight = Math.max(finalHeight, y + rowHeight + gap);
        });

    } else if (layoutMode === 'square') {
        const colWidth = (baseWidth - (gap * (count + 1))) / count;
        const cellSide = colWidth; // Square container
        
        images.forEach((imgObj, i) => {
            const img = highRes ? imgObj.original : imgObj.thumb;
            const colIndex = i % count;
            const rowIndex = Math.floor(i / count);
            
            // Container top-left
            const cx = gap + (colIndex * (cellSide + gap));
            const cy = gap + (rowIndex * (cellSide + gap));
            
            // Calculate image dimensions to fit in square (contain)
            const imgRatio = img.naturalWidth / img.naturalHeight;
            let drawW, drawH, dx, dy;

            if (imgRatio > 1) { // Landscape
                drawW = cellSide;
                drawH = cellSide / imgRatio;
                dx = cx;
                dy = cy + (cellSide - drawH) / 2;
            } else { // Portrait or Square
                drawH = cellSide;
                drawW = cellSide * imgRatio;
                dx = cx + (cellSide - drawW) / 2;
                dy = cy;
            }
            
            positions.push({ 
                img, x: dx, y: dy, w: drawW, h: drawH, crop: false,
                grid: gridWeight > 0 ? { x: cx, y: cy, w: cellSide, h: cellSide, weight: gridWeight, color: gridColor } : null
            });
            finalHeight = Math.max(finalHeight, cy + cellSide + gap);
        });

    } else if (layoutMode === 'row') {
        const rows = Array.from({ length: count }, () => []);
        images.forEach((img, i) => rows[i % count].push(img));

        let currentY = gap;
        rows.forEach(rowImages => {
            if (rowImages.length === 0) return;
            
            let totalAspectRatio = 0;
            rowImages.forEach(imgObj => {
                const img = highRes ? imgObj.original : imgObj.thumb;
                totalAspectRatio += (img.naturalWidth / img.naturalHeight);
            });

            const usefulWidth = baseWidth - (gap * (rowImages.length + 1));
            const rowHeight = usefulWidth / totalAspectRatio;
            
            let currentX = gap;
            rowImages.forEach(imgObj => {
                const img = highRes ? imgObj.original : imgObj.thumb;
                const w = (img.naturalWidth / img.naturalHeight) * rowHeight;
                positions.push({ img, x: currentX, y: currentY, w, h: rowHeight, crop: false });
                currentX += w + gap;
            });
            currentY += rowHeight + gap;
        });
        finalHeight = currentY;
    }

    canvas.width = baseWidth;
    canvas.height = finalHeight;

    const dimsDisplay = document.getElementById('dimsDisplay');
    const modeDisplay = document.getElementById('modeDisplay');
    if (dimsDisplay) dimsDisplay.textContent = `${baseWidth} x ${Math.round(finalHeight)} px`;
    if (modeDisplay) modeDisplay.textContent = highRes ? 'HD' : 'Preview';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    positions.forEach(pos => {
        ctx.save();
        if (radius > 0) {
            ctx.beginPath();
            ctx.roundRect(pos.x, pos.y, pos.w, pos.h, radius);
            ctx.clip();
        }

        if (pos.crop) {
            const imgRatio = pos.img.naturalWidth / pos.img.naturalHeight;
            const targetRatio = pos.w / pos.h;
            let sx, sy, sWidth, sHeight;

            if (imgRatio > targetRatio) {
                sHeight = pos.img.naturalHeight;
                sWidth = sHeight * targetRatio;
                sx = (pos.img.naturalWidth - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = pos.img.naturalWidth;
                sHeight = sWidth / targetRatio;
                sx = 0;
                sy = (pos.img.naturalHeight - sHeight) / 2;
            }
            ctx.drawImage(pos.img, sx, sy, sWidth, sHeight, pos.x, pos.y, pos.w, pos.h);
        } else {
            ctx.drawImage(pos.img, pos.x, pos.y, pos.w, pos.h);
        }
        ctx.restore();

        // Draw grid square on top if exists
        if (pos.grid) {
            ctx.strokeStyle = pos.grid.color;
            ctx.lineWidth = pos.grid.weight;
            ctx.strokeRect(pos.grid.x, pos.grid.y, pos.grid.w, pos.grid.h);
        }
    });
    ctx.filter = 'none';
}
