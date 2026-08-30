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

const targetDir = process.argv[2] || 'C:/Users/wowkd/Downloads/snap';

if (!fs.existsSync(targetDir)) {
    console.error(`❌ Error: Directory not found: ${targetDir}`);
    process.exit(1);
}

const files = fs.readdirSync(targetDir)
    .filter(f => /\.(jpe?g|png|webp|arw)$/i.test(f))
    .map(f => path.join(targetDir, f));

if (files.length === 0) {
    console.error(`❌ Error: No images found in ${targetDir}`);
    process.exit(1);
}

console.log(`\n==================================================`);
console.log(`🚀 CollageCreator Performance Benchmark (1000 Iterations)`);
console.log(`📁 Target Directory: ${targetDir}`);
console.log(`==================================================\n`);

console.log(`📷 Loaded ${files.length} test images from disk.`);

const tProbeStart = performance.now();
const rawMetaList = files.map((file, origIndex) => {
    const buffer = fs.readFileSync(file);
    const { width, height, ratio } = getJpegDimensions(buffer);
    return { origIndex, file, width, height, ratio };
});
const tProbeEnd = performance.now();
const probeTime = (tProbeEnd - tProbeStart);
console.log(`⏱️  Metadata Probe for ${files.length} images: ${probeTime.toFixed(2)} ms (${(probeTime / files.length).toFixed(2)} ms / image)\n`);

const testBatchSizes = [50, 30, 10];
const resultsTable = [];

for (const batchSize of testBatchSizes) {
    if (rawMetaList.length < batchSize) {
        console.warn(`⚠️ Warning: Not enough images for batch size ${batchSize} (available: ${rawMetaList.length})`);
        continue;
    }

    const testSet = rawMetaList.slice(0, batchSize);
    console.log(`--------------------------------------------------`);
    console.log(`🧪 Benchmarking Batch: ${batchSize} Images (1000 Iterations / Grid Width)`);
    console.log(`--------------------------------------------------`);

    const tStart = performance.now();
    
    // Evaluate across 15 candidate grid widths (modules 6 to 20) with 1000 iterations cap
    let bestVariant = null;
    let totalOptMs = 0;

    for (let cols = 6; cols <= 20; cols++) {
        const passStart = performance.now();
        const res = solveModularPacking(testSet, cols, false, true);
        const passEnd = performance.now();
        totalOptMs += (passEnd - passStart);

        if (!bestVariant || (res && res.score < bestVariant.score)) {
            bestVariant = { cols, ...res };
        }
    }

    const tEnd = performance.now();
    const totalBatchMs = (tEnd - tStart);

    resultsTable.push({
        batchSize,
        totalOptMs,
        avgPerGrid: totalOptMs / 15,
        bestCols: bestVariant.effectiveCols,
        totalRows: bestVariant.totalRows,
        emptyCells: bestVariant.emptyCells,
        score: bestVariant.score
    });

    console.log(`   - Total Optimization Time: ${totalOptMs.toFixed(2)} ms`);
    console.log(`   - Average Time per Grid Width: ${(totalOptMs / 15).toFixed(2)} ms`);
    console.log(`   - Selected Best Grid: ${bestVariant.effectiveCols} modules`);
    console.log(`   - Grid Rows: ${bestVariant.totalRows}`);
    console.log(`   - Gaps: ${bestVariant.emptyCells} ${bestVariant.emptyCells === 0 ? '(Perfect 100% Fill)' : ''}`);
    console.log(`   - Score: ${bestVariant.score}\n`);
}

console.log(`==================================================`);
console.log(`🏆 Benchmark Summary Table (1000 Iterations / Width)`);
console.log(`==================================================`);
console.log(`Image Count | Total Time (ms) | Avg / Grid (ms) | Best Grid | Gaps`);
console.log(`--------------------------------------------------`);
resultsTable.forEach(r => {
    console.log(`${r.batchSize.toString().padStart(3, ' ')} images   | ${r.totalOptMs.toFixed(2).padStart(12, ' ')} ms | ${r.avgPerGrid.toFixed(2).padStart(13, ' ')} ms | ${r.bestCols.toString().padStart(4, ' ')} mod   | ${r.emptyCells} (${r.emptyCells === 0 ? 'Gapless' : 'Holes'})`);
});
console.log(`==================================================\n`);
