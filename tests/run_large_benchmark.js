import { generateBinPackingVariants, solveModularPacking } from '../js/bin-packing.js';

// Box-Muller transform for Gaussian random numbers
function gaussianRandom(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

function generateSyntheticPhotos(count) {
    const photos = [];
    for (let i = 0; i < count; i++) {
        const randType = Math.random();
        let ratio;
        if (randType < 0.50) {
            // Landscape (around 3:2 = 1.5)
            ratio = gaussianRandom(1.50, 0.08);
        } else if (randType < 0.90) {
            // Portrait (around 2:3 = 0.667)
            ratio = gaussianRandom(0.667, 0.04);
        } else {
            // Square / near-square (around 1:1 = 1.0)
            ratio = gaussianRandom(1.00, 0.05);
        }
        ratio = Math.max(0.40, Math.min(2.50, ratio));

        let width = 1800;
        let height = Math.round(width / ratio);

        photos.push({
            origIndex: i,
            width,
            height,
            ratio
        });
    }
    return photos;
}

async function runLargeBenchmark() {
    console.log(`\n======================================================================`);
    console.log(`🚀 CollageCreator Large-Scale Benchmark (50 to 150 Images)`);
    console.log(`🎲 Gaussian Aspect Ratio Distribution (3:2 / 2:3 / 1:1)`);
    console.log(`======================================================================\n`);

    const sizes = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
    const TRIALS_PER_SIZE = 5;
    const summaryData = [];

    for (const size of sizes) {
        let totalTimeMs = 0;
        let totalIter = 0;
        let gaplessSuccesses = 0;
        let gridColsFreq = {};

        for (let trial = 0; trial < TRIALS_PER_SIZE; trial++) {
            const photos = generateSyntheticPhotos(size);
            const tStart = performance.now();
            const variants = generateBinPackingVariants(photos, true, 3000);
            const tEnd = performance.now();

            const elapsed = (tEnd - tStart);
            totalTimeMs += elapsed;

            const best = variants[0];
            if (best) {
                gridColsFreq[best.cols] = (gridColsFreq[best.cols] || 0) + 1;
                if (best.emptyCells === 0) gaplessSuccesses++;
                totalIter += (best.iterationsUsed || 0);
            }
        }

        const avgTimeMs = totalTimeMs / TRIALS_PER_SIZE;
        const avgIter = totalIter / TRIALS_PER_SIZE;
        const successRate = (gaplessSuccesses / TRIALS_PER_SIZE) * 100;
        const mostFreqCols = Object.keys(gridColsFreq).reduce((a, b) => gridColsFreq[a] > gridColsFreq[b] ? a : b, 12);

        summaryData.push({
            size,
            avgTimeMs,
            avgIter,
            successRate,
            mostFreqCols
        });

        console.log(`📸 Size: ${size.toString().padStart(3, ' ')} photos | Avg Time: ${avgTimeMs.toFixed(2).padStart(6, ' ')} ms | Avg Iter: ${avgIter.toFixed(0).padStart(4, ' ')} | Success: ${successRate.toFixed(0).padStart(3, ' ')}% | Dominant Grid: ${mostFreqCols} mod`);
    }

    console.log(`\n======================================================================`);
    console.log(`📊 JSON Summary Output for Chart Generation:`);
    console.log(`======================================================================`);
    console.log(JSON.stringify(summaryData, null, 2));
}

runLargeBenchmark().catch(console.error);
