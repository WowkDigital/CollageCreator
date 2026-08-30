import { solveModularPacking, generateBinPackingVariants } from './bin-packing.js';
export { solveModularPacking, generateBinPackingVariants };


export async function renderCollage(images, highRes = false, canvas, ctx, inputs) {
    if (images.length === 0) return;

    const layoutMode = document.querySelector('input[name="layout"]:checked').value;
    const count = parseInt(inputs.colCount.value) || 8;
    const gap = parseInt(inputs.gapSize.value);
    const radius = parseInt(inputs.radiusSize.value);
    const targetLongerEdge = parseInt(inputs.canvasWidth.value) || 2000;
    const bg = inputs.bgColor.value;
    const gridWeightInput = parseInt(inputs.gridWeight.value) || 0;
    const gridColor = inputs.gridColor.value;

    let positions = []; 
    let finalHeight = 0;

    // Use targetLongerEdge as virtual width first
    const virtualWidth = targetLongerEdge;

    if (layoutMode === 'bin-packing') {
        const requestedCols = Math.min(Math.max(6, count), 20);

        const bestCandidate = solveModularPacking(images, requestedCols, highRes);
        const effectiveCols = bestCandidate ? bestCandidate.effectiveCols : requestedCols;

        const moduleUnit = (virtualWidth - (gap * (effectiveCols + 1))) / effectiveCols;
        let currentMaxY = gap;

        if (bestCandidate && bestCandidate.placed) {
            bestCandidate.placed.forEach(block => {
                const cx = gap + block.gx * (moduleUnit + gap);
                const cy = gap + block.gy * (moduleUnit + gap);
                const cw = block.gw * moduleUnit + (block.gw - 1) * gap;
                const ch = block.gh * moduleUnit + (block.gh - 1) * gap;

                // Aspect-fit inside container with padding (no cropping)
                const imgAspect = block.img.naturalWidth / block.img.naturalHeight;
                const containerAspect = cw / ch;
                let dw, dh, dx, dy;

                if (Math.abs(imgAspect - containerAspect) < 0.005) {
                    dw = cw;
                    dh = ch;
                    dx = cx;
                    dy = cy;
                } else if (imgAspect > containerAspect) {
                    dw = cw;
                    dh = cw / imgAspect;
                    dx = cx;
                    dy = cy + (ch - dh) / 2;
                } else {
                    dh = ch;
                    dw = ch * imgAspect;
                    dx = cx + (cw - dw) / 2;
                    dy = cy;
                }

                positions.push({
                    img: block.img,
                    x: dx,
                    y: dy,
                    w: dw,
                    h: dh,
                    crop: false
                });

                currentMaxY = Math.max(currentMaxY, cy + ch + gap);
            });
        }

        finalHeight = currentMaxY;

    } else if (layoutMode === 'masonry') {
        const colWidth = (virtualWidth - (gap * (count + 1))) / count;
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
        const colWidth = (virtualWidth - (gap * (count + 1))) / count;
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
        const colWidth = (virtualWidth - (gap * (count + 1))) / count;
        const cellSide = colWidth;
        images.forEach((imgObj, i) => {
            const img = highRes ? imgObj.original : imgObj.thumb;
            const colIndex = i % count;
            const rowIndex = Math.floor(i / count);
            const cx = gap + (colIndex * (cellSide + gap));
            const cy = gap + (rowIndex * (cellSide + gap));
            const imgRatio = img.naturalWidth / img.naturalHeight;
            let drawW, drawH, dx, dy;
            if (imgRatio > 1) {
                drawW = cellSide;
                drawH = cellSide / imgRatio;
                dx = cx;
                dy = cy + (cellSide - drawH) / 2;
            } else {
                drawH = cellSide;
                drawW = cellSide * imgRatio;
                dx = cx + (cellSide - drawW) / 2;
                dy = cy;
            }
            positions.push({ 
                img, x: dx, y: dy, w: drawW, h: drawH, crop: false,
                grid: gridWeightInput > 0 ? { x: cx, y: cy, w: cellSide, h: cellSide, weight: gridWeightInput, color: gridColor } : null
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
            const usefulWidth = virtualWidth - (gap * (rowImages.length + 1));
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

    // Longer edge scaling logic
    let scale = 1.0;
    if (finalHeight > virtualWidth) {
        scale = targetLongerEdge / finalHeight;
    } else {
        scale = targetLongerEdge / virtualWidth;
    }

    const finalW = virtualWidth * scale;
    const finalH = finalHeight * scale;

    canvas.width = finalW;
    canvas.height = finalH;

    const dimsDisplay = document.getElementById('dimsDisplay');
    const modeDisplay = document.getElementById('modeDisplay');
    if (dimsDisplay) dimsDisplay.textContent = `${Math.round(finalW)} x ${Math.round(finalH)} px`;
    if (modeDisplay) modeDisplay.textContent = highRes ? 'HD' : 'Preview';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaledRadius = radius * scale;

    positions.forEach(pos => {
        ctx.save();
        const px = pos.x * scale;
        const py = pos.y * scale;
        const pw = pos.w * scale;
        const ph = pos.h * scale;

        if (scaledRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(px, py, pw, ph, scaledRadius);
            ctx.clip();
        }

        if (pos.crop) {
            const imgRatio = pos.img.naturalWidth / pos.img.naturalHeight;
            const targetRatio = pw / ph;
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
            ctx.drawImage(pos.img, sx, sy, sWidth, sHeight, px, py, pw, ph);
        } else {
            ctx.drawImage(pos.img, px, py, pw, ph);
        }
        ctx.restore();

        if (pos.grid) {
            ctx.strokeStyle = pos.grid.color;
            ctx.lineWidth = pos.grid.weight * scale;
            ctx.strokeRect(pos.grid.x * scale, pos.grid.y * scale, pos.grid.w * scale, pos.grid.h * scale);
        }
    });
    ctx.filter = 'none';
}
