/**
 * 2D Bin Packing Modular Solver
 * Evaluates discrete grid layout for given modular width (cols).
 * Returns placed blocks, dimensions, empty cells, and bottom raggedness.
 */
export function solveModularPacking(images, cols, highRes = false) {
    if (!images || images.length === 0) return null;

    // Classify each image into modular block dimensions (wu, hu)
    const rawBlocks = images.map((imgObj, origIndex) => {
        const img = (imgObj && (highRes ? imgObj.original : imgObj.thumb)) || imgObj;
        const nw = (img && (img.naturalWidth || img.width)) || 1200;
        const nh = (img && (img.naturalHeight || img.height)) || 800;
        const r = nw / nh;
        let wu = 3, hu = 2; // Default landscape: 3x2, area = 6

        if (r <= 0.88) {
            // Portrait photo
            if (r <= 0.45 && cols >= 6) {
                wu = 1; hu = 3;
            } else {
                wu = 2; hu = 3; // Standard portrait: 2x3, area = 6 (identical to 3x2!)
            }
        } else if (r >= 1.15) {
            // Landscape photo
            if (r >= 2.2 && cols >= 6) {
                wu = 4; hu = 2;
            } else {
                wu = 3; hu = 2; // Standard landscape: 3x2, area = 6
            }
        } else {
            // Square / near-square photo (0.88 < r < 1.15)
            wu = 2; hu = 2; // Area = 4
        }

        if (wu > cols) wu = cols;
        return { img, wu, hu, origIndex, ratio: r };
    });

    // If very few images, adapt grid columns so layout doesn't look excessively empty
    const totalNominalWidth = rawBlocks.reduce((acc, b) => acc + b.wu, 0);
    const maxBlockW = Math.max(...rawBlocks.map(b => b.wu));
    let effectiveCols = cols;
    if (effectiveCols > maxBlockW && rawBlocks.length <= 4 && totalNominalWidth < effectiveCols) {
        effectiveCols = Math.max(maxBlockW, totalNominalWidth);
    }

    const solvePacking = (orderList) => {
        const grid = [];
        const isOccupied = (gx, gy) => {
            if (!grid[gy]) return false;
            return !!grid[gy][gx];
        };
        const canPlace = (gx, gy, w, h) => {
            if (gx + w > effectiveCols) return false;
            for (let y = gy; y < gy + h; y++) {
                for (let x = gx; x < gx + w; x++) {
                    if (isOccupied(x, y)) return false;
                }
            }
            return true;
        };
        const occupy = (gx, gy, w, h) => {
            for (let y = gy; y < gy + h; y++) {
                while (grid.length <= y) {
                    grid.push(new Array(effectiveCols).fill(false));
                }
                for (let x = gx; x < gx + w; x++) {
                    grid[y][x] = true;
                }
            }
        };

        const unplaced = [...orderList];
        const placed = [];
        let curY = 0;
        let safetyLimit = 0;

        while (unplaced.length > 0 && safetyLimit < 1500) {
            safetyLimit++;
            let targetX = -1, targetY = -1;
            for (let y = curY; y < curY + 200; y++) {
                for (let x = 0; x < effectiveCols; x++) {
                    if (!isOccupied(x, y)) {
                        targetX = x;
                        targetY = y;
                        break;
                    }
                }
                if (targetX !== -1) break;
            }

            if (targetX === -1) {
                targetX = 0;
                targetY = grid.length;
            }

            curY = targetY;

            let freeSpan = 0;
            while (targetX + freeSpan < effectiveCols && !isOccupied(targetX + freeSpan, targetY)) {
                freeSpan++;
            }

            let selectedIdx = -1;
            for (let i = 0; i < unplaced.length; i++) {
                const item = unplaced[i];
                if (item.wu === freeSpan && canPlace(targetX, targetY, item.wu, item.hu)) {
                    selectedIdx = i;
                    break;
                }
            }

            if (selectedIdx === -1) {
                for (let i = 0; i < unplaced.length; i++) {
                    const item = unplaced[i];
                    if (canPlace(targetX, targetY, item.wu, item.hu)) {
                        selectedIdx = i;
                        break;
                    }
                }
            }

            if (selectedIdx !== -1) {
                const item = unplaced.splice(selectedIdx, 1)[0];
                occupy(targetX, targetY, item.wu, item.hu);
                placed.push({
                    ...item,
                    gx: targetX,
                    gy: targetY,
                    gw: item.wu,
                    gh: item.hu
                });
            } else {
                occupy(targetX, targetY, 1, 1);
            }
        }

        const totalRows = grid.length;
        let emptyCells = 0;
        for (let y = 0; y < totalRows; y++) {
            for (let x = 0; x < effectiveCols; x++) {
                if (!grid[y] || !grid[y][x]) emptyCells++;
            }
        }

        // Calculate bottom raggedness (max col height - min col height)
        const colHeights = new Array(effectiveCols).fill(0);
        placed.forEach(b => {
            for (let x = b.gx; x < b.gx + b.gw; x++) {
                colHeights[x] = Math.max(colHeights[x], b.gy + b.gh);
            }
        });
        const raggedness = Math.max(...colHeights) - Math.min(...colHeights);

        let orderDist = 0;
        placed.forEach((p, i) => {
            orderDist += Math.abs(p.origIndex - i);
        });

        const score = (totalRows * 1000) + (emptyCells * 4000) + (raggedness * 800) + (orderDist * 3);
        return { placed, grid, totalRows, emptyCells, raggedness, score, effectiveCols };
    };

    let bestCandidate = solvePacking(rawBlocks);

    if (rawBlocks.length > 2 && bestCandidate.emptyCells > 0) {
        const sortedByArea = [...rawBlocks].sort((a, b) => (b.wu * b.hu) - (a.wu * a.hu) || b.hu - a.hu);
        const cand2 = solvePacking(sortedByArea);
        if (cand2.score < bestCandidate.score) bestCandidate = cand2;
    }

    if (rawBlocks.length > 3 && bestCandidate.emptyCells > 0) {
        const landscapes = rawBlocks.filter(b => b.wu >= b.hu);
        const portraits = rawBlocks.filter(b => b.wu < b.hu);
        const alternated = [];
        let li = 0, pi = 0;
        while (li < landscapes.length || pi < portraits.length) {
            if (li < landscapes.length) alternated.push(landscapes[li++]);
            if (pi < portraits.length) alternated.push(portraits[pi++]);
        }
        const cand3 = solvePacking(alternated);
        if (cand3.score < bestCandidate.score) bestCandidate = cand3;
    }

    if (rawBlocks.length > 3 && bestCandidate.emptyCells > 0) {
        let seed = (rawBlocks.length * 997) + (effectiveCols * 31);
        const seededRandom = () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };

        for (let t = 0; t < 12; t++) {
            const perturbed = [...rawBlocks];
            for (let s = 0; s < perturbed.length - 1; s++) {
                if (seededRandom() < 0.35) {
                    const swapIdx = s + 1 + Math.floor(seededRandom() * Math.min(3, perturbed.length - s - 1));
                    const tmp = perturbed[s];
                    perturbed[s] = perturbed[swapIdx];
                    perturbed[swapIdx] = tmp;
                }
            }
            const candRand = solvePacking(perturbed);
            if (candRand.score < bestCandidate.score) {
                bestCandidate = candRand;
                if (bestCandidate.emptyCells === 0) break;
            }
        }
    }

    // Tolerance gap absorption
    bestCandidate.placed.forEach(block => {
        if (block.gx + block.gw < effectiveCols) {
            let canExpandRight = true;
            for (let y = block.gy; y < block.gy + block.gh; y++) {
                const cellOccupiedByOther = bestCandidate.placed.some(other => 
                    other !== block &&
                    other.gx <= block.gx + block.gw &&
                    other.gx + other.gw > block.gx + block.gw &&
                    other.gy <= y &&
                    other.gy + other.gh > y
                );
                if (cellOccupiedByOther) {
                    canExpandRight = false;
                    break;
                }
            }
            if (canExpandRight) {
                block.gw += 1;
            }
        }
    });

    return bestCandidate;
}

/**
 * Tests Grid Widths (Modules 6 to 20) to find configurations with 0 holes or lowest irregularity.
 * Returns exactly the 4 best unique matching layout variants.
 */
export function generateBinPackingVariants(images) {
    if (!images || images.length === 0) return [];

    const results = [];
    const seenSignatures = new Set();

    // Test grid widths from 6 to 20
    for (let c = 6; c <= 20; c++) {
        const res = solveModularPacking(images, c, false);
        if (!res || !res.placed || res.placed.length === 0) continue;

        const sig = `${res.effectiveCols}_${res.totalRows}_${res.emptyCells}_${res.raggedness}`;
        if (seenSignatures.has(sig)) continue;
        seenSignatures.add(sig);

        const ratio = res.effectiveCols / Math.max(1, res.totalRows);
        let ratioDesc = 'Kwadrat';
        if (ratio < 0.75) ratioDesc = 'Wysoki pion';
        else if (ratio < 0.92) ratioDesc = 'Pion';
        else if (ratio > 1.45) ratioDesc = 'Panorama';
        else if (ratio > 1.08) ratioDesc = 'Poziom';
        else ratioDesc = 'Kwadrat';

        const squareDist = Math.abs(ratio - 1.0);
        // Scoring formula:
        // 1. emptyCells * 100000 -> strict priority for zero gaps
        // 2. raggedness * 1500 -> flat bottom edge
        // 3. squareDist * 8000 -> strong preference for ratio closest to square (1.0)
        const score = (res.emptyCells * 100000) + (res.raggedness * 1500) + (squareDist * 8000);

        results.push({
            sliderVal: res.effectiveCols,
            cols: res.effectiveCols,
            emptyCells: res.emptyCells,
            raggedness: res.raggedness,
            totalRows: res.totalRows,
            aspectRatio: ratio,
            squareDist,
            ratioDesc,
            placed: res.placed.map(p => ({
                img: p.img,
                gx: p.gx,
                gy: p.gy,
                gw: p.gw,
                gh: p.gh
            })),
            isPerfect: res.emptyCells === 0 && res.raggedness === 0,
            isGapless: res.emptyCells === 0,
            score
        });
    }

    // Sort by best score: 0 holes first, flattest bottom, and closest to square
    results.sort((a, b) => a.score - b.score);
    // Return top 4 best matches
    return results.slice(0, 4);
}

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
