import { solveModularPacking } from '../js/bin-packing.js';

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
        if (randType < 0.50) ratio = gaussianRandom(1.50, 0.08);
        else if (randType < 0.90) ratio = gaussianRandom(0.667, 0.04);
        else ratio = gaussianRandom(1.00, 0.05);
        ratio = Math.max(0.40, Math.min(2.50, ratio));

        photos.push({
            origIndex: i,
            width: 1800,
            height: Math.round(1800 / ratio),
            ratio
        });
    }
    return photos;
}

async function runModBreakdownTest() {
    console.log(`\n======================================================================`);
    console.log(`🔬 Grid Width Breakdown Test (Modules 15, 16, 17, 18, 19, 20)`);
    console.log(`Checking if EVERY grid width in range achieves 0-gap layout`);
    console.log(`======================================================================\n`);

    const sizes = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
    const targetMods = [15, 16, 17, 18, 19, 20];
    const TRIALS = 3;

    const modResults = {};
    targetMods.forEach(m => {
        modResults[m] = { successCount: 0, totalAttempts: 0, avgTime: 0, avgIter: 0, totalGaps: 0 };
    });

    const sizeModMatrix = {};

    for (const size of sizes) {
        sizeModMatrix[size] = {};
        const photos = generateSyntheticPhotos(size);

        for (const cols of targetMods) {
            let modSuccess = 0;
            let timeSum = 0;
            let iterSum = 0;
            let gapSum = 0;

            for (let t = 0; t < TRIALS; t++) {
                const shuffled = [...photos].sort(() => Math.random() - 0.5);
                shuffled.forEach((p, idx) => p.origIndex = idx);

                const tStart = performance.now();
                const res = solveModularPacking(shuffled, cols, false, true, null, 10000);
                const elapsed = performance.now() - tStart;

                timeSum += elapsed;
                iterSum += (res.iterationsUsed || 0);
                gapSum += res.emptyCells;

                if (res.emptyCells === 0) {
                    modSuccess++;
                }
            }

            sizeModMatrix[size][cols] = {
                successRate: (modSuccess / TRIALS) * 100,
                avgTime: timeSum / TRIALS,
                avgIter: iterSum / TRIALS,
                avgGaps: gapSum / TRIALS
            };

            modResults[cols].successCount += modSuccess;
            modResults[cols].totalAttempts += TRIALS;
            modResults[cols].avgTime += timeSum;
            modResults[cols].avgIter += iterSum;
            modResults[cols].totalGaps += gapSum;
        }

        console.log(`📸 Size ${size.toString().padStart(3, ' ')} photos: ` + 
            targetMods.map(m => `Mod ${m}: ${sizeModMatrix[size][m].avgGaps === 0 ? '✅ 0 luk' : `⚠️ ${sizeModMatrix[size][m].avgGaps.toFixed(1)} luk`}`).join(' | '));
    }

    console.log(`\n======================================================================`);
    console.log(`📊 Summary by Module Width Across ALL Image Collection Sizes (50-150):`);
    console.log(`======================================================================`);

    for (const m of targetMods) {
        const total = modResults[m].totalAttempts;
        const succ = modResults[m].successCount;
        const pct = ((succ / total) * 100).toFixed(1);
        const avgT = (modResults[m].avgTime / total).toFixed(2);
        const avgI = (modResults[m].avgIter / total).toFixed(0);
        const avgG = (modResults[m].totalGaps / total).toFixed(2);

        console.log(`Siatka Mod ${m.toString().padStart(2, ' ')}: Sukces 0 Luk: ${succ}/${total} (${pct.padStart(5, ' ')}%) | Avg Czas: ${avgT.padStart(6, ' ')} ms | Avg Iteracje: ${avgI.padStart(5, ' ')} | Avg Luki: ${avgG}`);
    }
}

runModBreakdownTest().catch(console.error);
