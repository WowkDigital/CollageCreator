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

const rawMetaList = files.map((file, origIndex) => {
    const buffer = fs.readFileSync(file);
    const { width, height, ratio } = getJpegDimensions(buffer);
    return { origIndex, file, width, height, ratio };
});

console.log(`\n==================================================`);
console.log(`🔬 Local Minimum Analysis & Escape Mechanism Test`);
console.log(`==================================================\n`);

const trials = 20;
let gaplessSuccesses = 0;
let totalIter = 0;
let totalMs = 0;

for (let i = 1; i <= trials; i++) {
    const shuffled = [...rawMetaList].sort(() => Math.random() - 0.5);
    shuffled.forEach((item, idx) => item.origIndex = idx);

    const tStart = performance.now();
    const res = solveModularPacking(shuffled, 18, false, true, null, 10000);
    const elapsed = performance.now() - tStart;
    totalMs += elapsed;
    totalIter += (res.iterationsUsed || 0);

    if (res.emptyCells === 0) gaplessSuccesses++;

    console.log(`Trial ${i.toString().padStart(2, ' ')}: Time = ${elapsed.toFixed(2).padStart(6, ' ')} ms | Gaps = ${res.emptyCells} | Iterations Used = ${res.iterationsUsed}`);
}

console.log(`\n--------------------------------------------------`);
console.log(`Summary across ${trials} trials:`);
console.log(`  - Gapless Success Rate: ${gaplessSuccesses}/${trials} (${(gaplessSuccesses/trials*100).toFixed(1)}%)`);
console.log(`  - Average Time per Trial: ${(totalMs/trials).toFixed(2)} ms`);
console.log(`  - Average Iterations Used: ${(totalIter/trials).toFixed(0)}`);
console.log(`--------------------------------------------------\n`);
