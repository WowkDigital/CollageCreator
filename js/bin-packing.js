/**
 * 2D Bin Packing Modular Solver & Variant Generator
 * Dedicated module for calculating optimal modular block layouts.
 */

/**
 * Extracts width, height, and natural aspect ratio from an image or metadata object.
 */
export function getImageDimensions(item) {
    if (!item) return { width: 1200, height: 800, ratio: 1.5 };
    
    // Check direct properties if it's already a dimension descriptor
    if (typeof item.width === 'number' && typeof item.height === 'number' && item.height > 0) {
        return { width: item.width, height: item.height, ratio: item.width / item.height };
    }
    if (typeof item.w === 'number' && typeof item.h === 'number' && item.h > 0) {
        return { width: item.w, height: item.h, ratio: item.w / item.h };
    }
    if (typeof item.ratio === 'number' && item.ratio > 0) {
        return { width: Math.round(item.ratio * 1000), height: 1000, ratio: item.ratio };
    }

    // Check underlying image element
    const img = item.original || item.thumb || item;
    const nw = (img && (img.naturalWidth || img.width)) || 1200;
    const nh = (img && (img.naturalHeight || img.height)) || 800;
    return { width: nw, height: nh, ratio: nw / nh };
}

/**
 * Classifies an image into modular block width and height (wu, hu) based on ratio and total columns.
 */
export function classifyImageToBlock(item, cols, origIndex = 0, highRes = false) {
    const { width: nw, height: nh, ratio: r } = getImageDimensions(item);
    const img = (highRes ? item.original : (item.thumb || item.original)) || (item.tagName === 'IMG' ? item : null);

    let wu = 3, hu = 2; // Default landscape: 3x2, area = 6

    if (r <= 0.88) {
        // Portrait photo
        if (r <= 0.45 && cols >= 6) {
            wu = 1; hu = 3;
        } else {
            wu = 2; hu = 3; // Standard portrait: 2x3, area = 6
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

    return {
        item,
        img,
        wu,
        hu,
        origIndex,
        ratio: r,
        width: nw,
        height: nh
    };
}

/**
 * 2D Bin Packing Modular Solver
 * Evaluates discrete grid layout for given modular width (cols).
 * Returns placed blocks, dimensions, empty cells, and bottom raggedness.
 */
export function solveModularPacking(items, cols, highRes = false, deepOptimization = false, deadline = null, maxIterations = 10000) {
    if (!items || items.length === 0) return null;

    // Classify each item into modular block dimensions (wu, hu)
    const rawBlocks = items.map((item, idx) => classifyImageToBlock(item, cols, idx, highRes));

    // If very few images, adapt grid columns so layout doesn't look excessively empty
    const totalNominalWidth = rawBlocks.reduce((acc, b) => acc + b.wu, 0);
    const maxBlockW = Math.max(...rawBlocks.map(b => b.wu));
    let effectiveCols = cols;
    if (effectiveCols > maxBlockW && rawBlocks.length <= 4 && totalNominalWidth < effectiveCols) {
        effectiveCols = Math.max(maxBlockW, totalNominalWidth);
    }

    // Preallocated flat grid buffer to avoid array allocation overhead in simulated search loops
    const GRID_MAX_COLS = 24;
    const GRID_MAX_ROWS = 1000;
    const gridBuffer = new Uint8Array(GRID_MAX_COLS * GRID_MAX_ROWS);

    const solvePacking = (orderList) => {
        gridBuffer.fill(0);
        let maxRow = 0;

        const isOccupied = (gx, gy) => {
            if (gy >= GRID_MAX_ROWS || gx >= effectiveCols) return true;
            return gridBuffer[gy * GRID_MAX_COLS + gx] === 1;
        };

        const canPlace = (gx, gy, w, h) => {
            if (gx + w > effectiveCols) return false;
            for (let y = gy; y < gy + h; y++) {
                const rowOffset = y * GRID_MAX_COLS;
                for (let x = gx; x < gx + w; x++) {
                    if (gridBuffer[rowOffset + x] === 1) return false;
                }
            }
            return true;
        };

        const occupy = (gx, gy, w, h) => {
            for (let y = gy; y < gy + h; y++) {
                const rowOffset = y * GRID_MAX_COLS;
                for (let x = gx; x < gx + w; x++) {
                    gridBuffer[rowOffset + x] = 1;
                }
            }
            if (gy + h > maxRow) maxRow = gy + h;
        };

        const unplaced = [...orderList];
        const placed = [];
        let curY = 0;
        let safetyLimit = 0;

        while (unplaced.length > 0 && safetyLimit < 1500) {
            safetyLimit++;
            let targetX = -1, targetY = -1;
            for (let y = curY; y < curY + 200; y++) {
                const rowOffset = y * GRID_MAX_COLS;
                for (let x = 0; x < effectiveCols; x++) {
                    if (gridBuffer[rowOffset + x] === 0) {
                        targetX = x;
                        targetY = y;
                        break;
                    }
                }
                if (targetX !== -1) break;
            }

            if (targetX === -1) {
                targetX = 0;
                targetY = maxRow;
            }

            curY = targetY;

            let freeSpan = 0;
            const curRowOffset = targetY * GRID_MAX_COLS;
            while (targetX + freeSpan < effectiveCols && gridBuffer[curRowOffset + targetX + freeSpan] === 0) {
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

        const totalRows = Math.max(1, maxRow);
        let emptyCells = 0;
        for (let y = 0; y < totalRows; y++) {
            const rowOffset = y * GRID_MAX_COLS;
            for (let x = 0; x < effectiveCols; x++) {
                if (gridBuffer[rowOffset + x] === 0) emptyCells++;
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
        return { placed, totalRows, emptyCells, raggedness, score, effectiveCols };
    };

    let bestCandidate = solvePacking(rawBlocks);

    // Heuristic 1: Sort by Block Area & Height
    if (rawBlocks.length > 2) {
        const sortedByArea = [...rawBlocks].sort((a, b) => (b.wu * b.hu) - (a.wu * a.hu) || b.hu - a.hu);
        const candArea = solvePacking(sortedByArea);
        if (candArea.score < bestCandidate.score) bestCandidate = candArea;
    }

    // Heuristic 2: Sort by Height descending (tall portrait blocks first to avoid hanging columns)
    if (rawBlocks.length > 2) {
        const sortedByHeight = [...rawBlocks].sort((a, b) => b.hu - a.hu || (b.wu * b.hu) - (a.wu * a.hu));
        const candH = solvePacking(sortedByHeight);
        if (candH.score < bestCandidate.score) bestCandidate = candH;
    }

    // Heuristic 3: Interleaved Landscapes and Portraits
    if (rawBlocks.length > 3) {
        const landscapes = rawBlocks.filter(b => b.wu >= b.hu);
        const portraits = rawBlocks.filter(b => b.wu < b.hu);
        const alternated = [];
        let li = 0, pi = 0;
        while (li < landscapes.length || pi < portraits.length) {
            if (li < landscapes.length) alternated.push(landscapes[li++]);
            if (pi < portraits.length) alternated.push(portraits[pi++]);
        }
        const candAlt = solvePacking(alternated);
        if (candAlt.score < bestCandidate.score) bestCandidate = candAlt;
    }

    // Heuristic 4: Paired Portraits (two 2x3 portraits side-by-side make 4x3 or 6x3 with landscapes)
    if (rawBlocks.length > 3) {
        const landscapes = rawBlocks.filter(b => b.wu >= b.hu);
        const portraits = rawBlocks.filter(b => b.wu < b.hu);
        const paired = [];
        let li = 0, pi = 0;
        while (li < landscapes.length || pi < portraits.length) {
            if (pi < portraits.length) {
                paired.push(portraits[pi++]);
                if (pi < portraits.length) paired.push(portraits[pi++]);
            }
            if (li < landscapes.length) {
                paired.push(landscapes[li++]);
                if (li < landscapes.length) paired.push(landscapes[li++]);
            }
        }
        const candPaired = solvePacking(paired);
        if (candPaired.score < bestCandidate.score) bestCandidate = candPaired;
    }

    // Fast return if initial heuristics already found a perfect gapless layout with 0 raggedness
    if (bestCandidate.emptyCells === 0 && bestCandidate.raggedness === 0) {
        bestCandidate.iterationsUsed = 0;
        return bestCandidate;
    }

    // Simulated Annealing Hill-Climbing Search (capped at maxIterations or strict time deadline)
    if (rawBlocks.length > 3) {
        const orderHash = rawBlocks.reduce((acc, b, i) => (acc * 31 + (b.origIndex || 0) + i) % 1000007, 0);
        let seed = (rawBlocks.length * 997) + (effectiveCols * 31) + orderHash + (deepOptimization ? 7777 : 0);
        const seededRandom = () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };

        let topOrder = [...bestCandidate.placed].map(p => rawBlocks[p.origIndex] || p);
        let iterationsUsed = 0;
        let stagnantCount = 0;

        for (let t = 0; t < maxIterations; t++) {
            iterationsUsed = t + 1;
            stagnantCount++;

            // Escape local minima: If stuck for 50 iterations without finding a better layout score, kick search state
            if (stagnantCount > 50) {
                stagnantCount = 0;
                const kickCount = Math.floor(topOrder.length * 0.35);
                for (let k = 0; k < kickCount; k++) {
                    const k1 = Math.floor(seededRandom() * topOrder.length);
                    const k2 = Math.floor(seededRandom() * topOrder.length);
                    if (k1 !== k2) {
                        const tmp = topOrder[k1];
                        topOrder[k1] = topOrder[k2];
                        topOrder[k2] = tmp;
                    }
                }
            }

            // Strict deadline check every 25 iterations
            if (deadline && (t % 25 === 0) && performance.now() >= deadline) {
                break;
            }

            const perturbed = [...topOrder];
            // Variable swap temperature
            const swapCount = Math.max(1, Math.floor(rawBlocks.length * (t % 2 === 0 ? 0.08 : (t % 5 === 0 ? 0.20 : 0.04))));
            for (let s = 0; s < swapCount; s++) {
                const i1 = Math.floor(seededRandom() * perturbed.length);
                const i2 = Math.floor(seededRandom() * perturbed.length);
                if (i1 !== i2) {
                    const tmp = perturbed[i1];
                    perturbed[i1] = perturbed[i2];
                    perturbed[i2] = tmp;
                }
            }

            const candRand = solvePacking(perturbed);
            if (candRand.score < bestCandidate.score) {
                bestCandidate = candRand;
                stagnantCount = 0;
                topOrder = [...candRand.placed].map(p => rawBlocks[p.origIndex] || p);

                // EARLY STOPPING: Stop immediately as soon as a 100% gapless solution with flat bottom is found!
                if (bestCandidate.emptyCells === 0 && bestCandidate.raggedness === 0) {
                    break;
                }
            }
        }

        bestCandidate.iterationsUsed = iterationsUsed;
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
 * Capped at 1000 iterations per width OR maxTimeMs (default 2000ms = 2s total execution).
 */
export function generateBinPackingVariants(items, deepOptimization = false, maxTimeMs = 2000) {
    if (!items || items.length === 0) return [];

    const results = [];
    const seenSignatures = new Set();
    const deadline = performance.now() + (maxTimeMs || 2000);
    const iterCap = deepOptimization ? 10000 : 2000;

    // Test grid widths from 6 to 20
    for (let c = 6; c <= 20; c++) {
        if (performance.now() >= deadline) {
            break;
        }

        const res = solveModularPacking(items, c, false, deepOptimization, deadline, iterCap);
        if (!res || !res.placed || res.placed.length === 0) continue;

        const sig = `${res.effectiveCols}_${res.totalRows}_${res.emptyCells}_${res.raggedness}`;
        if (seenSignatures.has(sig)) continue;
        seenSignatures.add(sig);

        const ratio = res.effectiveCols / Math.max(1, res.totalRows);
        let ratioDesc = 'Square';
        if (ratio < 0.75) ratioDesc = 'Tall Portrait';
        else if (ratio < 0.92) ratioDesc = 'Portrait';
        else if (ratio > 1.45) ratioDesc = 'Panorama';
        else if (ratio > 1.08) ratioDesc = 'Landscape';
        else ratioDesc = 'Square';

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
                item: p.item,
                origIndex: p.origIndex,
                gx: p.gx,
                gy: p.gy,
                gw: p.gw,
                gh: p.gh
            })),
            isPerfect: res.emptyCells === 0 && res.raggedness === 0,
            isGapless: res.emptyCells === 0,
            iterationsUsed: res.iterationsUsed || 0,
            score
        });
    }

    // Sort by best score: 0 holes first, flattest bottom, and closest to square
    results.sort((a, b) => a.score - b.score);
    // Return top 4 best matches
    return results.slice(0, 4);
}
