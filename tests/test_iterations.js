import fs from 'fs';
import path from 'path';
import { solveModularPacking } from '../js/bin-packing.js';

function getJpegDimensions(buffer) {
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        return { width: 1200, height: 800, ratio: 1.5 };
    }
    let offset = 2;
    while (offset < buffer.length) {
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height, ratio: width / height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
    }
    return { width: 1200, height: 800, ratio: 1.5 };
}

const targetDir = 'C:/Users/wowkd/Downloads/snap';
const files = fs.readdirSync(targetDir)
    .filter(f => /\.(jpe?g|png|webp|arw)$/i.test(f))
    .map(f => path.join(targetDir, f));

console.log(`Loaded ${files.length} images.`);

const rawMetaList = files.map((file, origIndex) => {
    const buffer = fs.readFileSync(file);
    const { width, height, ratio } = getJpegDimensions(buffer);
    return { origIndex, file, width, height, ratio };
});

const cols = 18;
const iterationCaps = [1000, 10000, 100000];

console.log(`\n==================================================`);
console.log(`🔬 Testing Iteration Caps (1,000 vs 10,000 vs 100,000) for Mod ${cols}`);
console.log(`==================================================\n`);

const trials = 5;

for (const maxIter of iterationCaps) {
    console.log(`--------------------------------------------------`);
    console.log(`🧪 Testing Max Iterations: ${maxIter.toLocaleString()}`);
    console.log(`--------------------------------------------------`);

    let gaplessCount = 0;
    let totalTime = 0;

    for (let trial = 1; trial <= trials; trial++) {
        const shuffled = [...rawMetaList].sort((a, b) => (Math.random() - 0.5));
        shuffled.forEach((item, i) => item.origIndex = i);

        const tStart = performance.now();
        const res = solveModularPacking(shuffled, cols, false, true, null, maxIter);
        const tEnd = performance.now();
        const elapsed = (tEnd - tStart);
        totalTime += elapsed;

        if (res.emptyCells === 0) gaplessCount++;

        console.log(`  Trial ${trial}: Time = ${elapsed.toFixed(2).padStart(7, ' ')} ms | Gaps = ${res.emptyCells} | Raggedness = ${res.raggedness} | Iterations Used = ${res.iterationsUsed || 'N/A'}`);
    }

    console.log(`   --> Gapless Success Rate: ${gaplessCount}/${trials} (${((gaplessCount/trials)*100).toFixed(0)}%)`);
    console.log(`   --> Avg Execution Time: ${(totalTime / trials).toFixed(2)} ms\n`);
}
