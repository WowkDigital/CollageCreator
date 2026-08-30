export const dropZone = document.getElementById('dropZone');
export const emptyState = document.getElementById('emptyState');
export const emptyStateFileInput = document.getElementById('emptyStateFileInput');
export const fileInput = document.getElementById('imageUpload');
export const thumbnailsList = document.getElementById('thumbnailsList');
export const settingsSection = document.getElementById('settingsSection');
export const canvasWrapper = document.getElementById('canvasWrapper');
export const canvas = document.getElementById('mainCanvas');
export const ctx = canvas.getContext('2d');
export const generateBtn = document.getElementById('generateBtn');
export const resetBtn = document.getElementById('resetBtn');
export const shuffleBtn = document.getElementById('shuffleBtn');
export const sortAlphaBtn = document.getElementById('sortAlphaBtn');
export const sortDateBtn = document.getElementById('sortDateBtn');
export const infoBar = document.getElementById('infoBar');
export const imgCountSpan = document.getElementById('imgCountTotal');
export const processingIndicator = document.getElementById('processingIndicator');
export const loaderCount = document.getElementById('loaderCount');
export const resultWrapper = document.getElementById('resultWrapper');
export const resultsList = document.getElementById('resultsList');
export const downloadAllBtn = document.getElementById('downloadAllBtn');
export const backToEditBtn = document.getElementById('backToEditBtn');
export const toggleImagesBtn = document.getElementById('toggleImagesBtn');
export const imagesManagementWrapper = document.getElementById('imagesManagementWrapper');
export const imagesChevron = document.getElementById('imagesChevron');
export const previewMain = document.getElementById('previewMain');
export const toggleMobilePreviewBtn = document.getElementById('toggleMobilePreviewBtn');
export const togglePreviewIcon = document.getElementById('togglePreviewIcon');
export const togglePreviewText = document.getElementById('togglePreviewText');
export const mobileShowPreviewBanner = document.getElementById('mobileShowPreviewBanner');
export const binPackingVariantsContainer = document.getElementById('binPackingVariantsContainer');
export const variantSuggestionsList = document.getElementById('variantSuggestionsList');
export const variantsFoundBadge = document.getElementById('variantsFoundBadge');
export const deepOptimizeBtn = document.getElementById('deepOptimizeBtn');
export const deepOptimizeBtnText = document.getElementById('deepOptimizeBtnText');
export const skeletonWorkspace = document.getElementById('skeletonWorkspace');
export const skeletonBoard = document.getElementById('skeletonBoard');

// Inputs
export const inputs = {
    layout: document.getElementsByName('layout'),
    colCount: document.getElementById('colCount'),
    countLabel: document.getElementById('countLabel'),
    gapSize: document.getElementById('gapSize'),
    radiusSize: document.getElementById('radiusSize'),
    bgColor: document.getElementById('bgColor'),
    canvasWidth: document.getElementById('canvasWidth'),
    format: document.getElementById('exportFormat'),
    maxImages: document.getElementById('maxImagesPerCollage'),
    collageCount: document.getElementById('collageCount'),
    gridWeight: document.getElementById('gridWeight'),
    gridColor: document.getElementById('gridColor')
};

export function updateUI(images) {
    imgCountSpan.textContent = images.length;
    
    if (images.length > 0) {
        settingsSection.classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('thumbnailsSection').classList.remove('hidden');
        emptyState.classList.add('hidden');
        canvasWrapper.classList.remove('hidden');
        generateBtn.disabled = false;
        infoBar.classList.remove('hidden');
    } else {
        settingsSection.classList.add('opacity-50', 'pointer-events-none');
        document.getElementById('thumbnailsSection').classList.add('hidden');
        emptyState.classList.remove('hidden');
        canvasWrapper.classList.add('hidden');
        generateBtn.disabled = true;
        infoBar.classList.add('hidden');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

export function renderThumbnails(images, deleteCallback, moveCallback, endDragCallback) {
    thumbnailsList.innerHTML = '';
    images.forEach((imgObj, index) => {
        const div = document.createElement('div');
        div.className = 'relative w-full aspect-square rounded-lg overflow-hidden cursor-move border border-gray-600 bg-gray-800 thumbnail-item group shadow-sm';
        div.draggable = true;
        div.dataset.index = index;

        const thumb = document.createElement('img');
        thumb.src = imgObj.thumb.src;
        thumb.className = 'w-full h-full object-cover pointer-events-none';
        
        // Badge index
        const indexBadge = document.createElement('span');
        indexBadge.className = 'absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none';
        indexBadge.textContent = index + 1;

        // Action Toolbar Overlay
        const actionOverlay = document.createElement('div');
        actionOverlay.className = 'absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1 pointer-events-none';

        // Delete button top right
        const topRow = document.createElement('div');
        topRow.className = 'flex justify-end';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bg-red-600/90 text-white p-1.5 hover:bg-red-600 transition-colors backdrop-blur-sm rounded-md shadow pointer-events-auto flex items-center justify-center';
        deleteBtn.title = 'Remove image';
        deleteBtn.innerHTML = '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCallback(index);
        };
        topRow.appendChild(deleteBtn);

        // Move Controls bottom row
        const bottomRow = document.createElement('div');
        bottomRow.className = 'flex justify-between items-center gap-1 mt-auto';

        // Move left / up
        const moveLeftBtn = document.createElement('button');
        moveLeftBtn.className = `bg-gray-900/80 text-white p-1.5 hover:bg-accentGreen hover:text-black transition-colors rounded-md backdrop-blur-sm pointer-events-auto flex items-center justify-center ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`;
        moveLeftBtn.title = 'Move left/up';
        moveLeftBtn.disabled = index === 0;
        moveLeftBtn.innerHTML = '<i data-lucide="chevron-left" class="w-4 h-4"></i>';
        moveLeftBtn.onclick = (e) => {
            e.stopPropagation();
            if (index > 0 && moveCallback) moveCallback(index, index - 1);
        };

        // Move right / down
        const moveRightBtn = document.createElement('button');
        moveRightBtn.className = `bg-gray-900/80 text-white p-1.5 hover:bg-accentGreen hover:text-black transition-colors rounded-md backdrop-blur-sm pointer-events-auto flex items-center justify-center ${index === images.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`;
        moveRightBtn.title = 'Move right/down';
        moveRightBtn.disabled = index === images.length - 1;
        moveRightBtn.innerHTML = '<i data-lucide="chevron-right" class="w-4 h-4"></i>';
        moveRightBtn.onclick = (e) => {
            e.stopPropagation();
            if (index < images.length - 1 && moveCallback) moveCallback(index, index + 1);
        };

        bottomRow.appendChild(moveLeftBtn);
        bottomRow.appendChild(moveRightBtn);

        actionOverlay.appendChild(topRow);
        actionOverlay.appendChild(bottomRow);

        div.appendChild(thumb);
        div.appendChild(indexBadge);
        div.appendChild(actionOverlay);
        
        div.addEventListener('dragstart', () => {
            div.classList.add('dragging');
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            if (endDragCallback) endDragCallback();
        });
        
        thumbnailsList.appendChild(div);
    });
    lucide.createIcons();
}

export function updateValueDisplays() {
    const layout = document.querySelector('input[name="layout"]:checked')?.value || 'bin-packing';
    if (layout === 'row') {
        inputs.countLabel.textContent = "Rows";
    } else if (layout === 'bin-packing') {
        inputs.countLabel.textContent = "Grid Width (Modules 6–20)";
    } else {
        inputs.countLabel.textContent = "Columns";
    }

    if (layout === 'bin-packing') {
        inputs.colCount.min = "6";
        inputs.colCount.max = "20";
        if (parseInt(inputs.colCount.value) < 6) inputs.colCount.value = "8";
        const val = parseInt(inputs.colCount.value) || 8;
        document.getElementById('colCountVal').textContent = `${val} mod`;
        if (binPackingVariantsContainer) binPackingVariantsContainer.classList.remove('hidden');
    } else {
        inputs.colCount.min = "1";
        inputs.colCount.max = "8";
        if (parseInt(inputs.colCount.value) > 8) inputs.colCount.value = "4";
        document.getElementById('colCountVal').textContent = inputs.colCount.value;
        if (binPackingVariantsContainer) binPackingVariantsContainer.classList.add('hidden');
    }
    document.getElementById('gapVal').textContent = inputs.gapSize.value;
    document.getElementById('radiusVal').textContent = inputs.radiusSize.value;
    
    // Grid settings visibility
    const gridSettings = document.getElementById('gridSettings');
    if (layout === 'square') {
        gridSettings.classList.remove('hidden');
        document.getElementById('gridWeightVal').textContent = inputs.gridWeight.value;
        document.getElementById('gridColorPreview').style.backgroundColor = inputs.gridColor.value;
    } else {
        gridSettings.classList.add('hidden');
    }
}

export function renderVariantSuggestions(variants, onSelect) {
    if (!variantSuggestionsList) return;
    variantSuggestionsList.innerHTML = '';

    if (!variants || variants.length === 0) {
        if (variantsFoundBadge) variantsFoundBadge.classList.add('hidden');
        if (deepOptimizeBtn) deepOptimizeBtn.classList.add('hidden');
        variantSuggestionsList.innerHTML = '<div class="col-span-2 text-center text-[10px] text-gray-400 py-4 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">Upload images to generate 4 variants</div>';
        return;
    }

    if (variantsFoundBadge) {
        variantsFoundBadge.classList.remove('hidden');
        variantsFoundBadge.textContent = 'TOP 4';
    }
    if (deepOptimizeBtn) {
        deepOptimizeBtn.classList.remove('hidden');
    }

    const currentSliderVal = parseInt(inputs.colCount.value) || 8;
    const top4 = variants.slice(0, 4);

    top4.forEach(variant => {
        const isSelected = currentSliderVal === variant.sliderVal;

        // Card container is explicitly a square!
        const card = document.createElement('div');
        card.className = `group relative cursor-pointer rounded-xl overflow-hidden aspect-square transition-all border p-1.5 flex items-center justify-center ${
            isSelected 
                ? 'bg-accentGreen/15 border-accentGreen shadow-md ring-2 ring-accentGreen/60' 
                : 'bg-[#0d0d18] border-gray-700/80 hover:border-accentGreen/60 hover:bg-gray-800/40'
        }`;
        card.title = `${variant.cols} modules (${variant.ratioDesc}, ${variant.isGapless ? '0 gaps' : variant.emptyCells + ' gaps'})`;

        // Miniature square canvas: 220x220 for crisp preview
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 220;
        miniCanvas.height = 220;
        miniCanvas.className = 'w-full h-full object-contain rounded-lg pointer-events-none';
        
        const mctx = miniCanvas.getContext('2d');
        if (mctx) {
            // Background fill
            mctx.fillStyle = inputs.bgColor.value || '#0a0a14';
            mctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

            const pad = 6;
            const availW = miniCanvas.width - pad * 2;
            const availH = miniCanvas.height - pad * 2;
            const scaleX = availW / variant.cols;
            const scaleY = availH / Math.max(1, variant.totalRows);
            const scale = Math.min(scaleX, scaleY);

            const offsetX = pad + (availW - (variant.cols * scale)) / 2;
            const offsetY = pad + (availH - (variant.totalRows * scale)) / 2;

            // Subtle module gap
            const miniGap = Math.max(1, Math.round(scale * 0.08));

            variant.placed.forEach(b => {
                const bx = offsetX + b.gx * scale;
                const by = offsetY + b.gy * scale;
                const bw = b.gw * scale - miniGap;
                const bh = b.gh * scale - miniGap;

                if (bw <= 0 || bh <= 0) return;

                const img = b.img;
                if (img && (img.complete || img.naturalWidth > 0)) {
                    const nw = img.naturalWidth || img.width || 1;
                    const nh = img.naturalHeight || img.height || 1;
                    const ir = nw / nh;
                    const br = bw / bh;
                    let sx = 0, sy = 0, sw = nw, sh = nh;
                    if (ir > br) {
                        sw = nh * br;
                        sx = (nw - sw) / 2;
                    } else {
                        sh = nw / br;
                        sy = (nh - sh) / 2;
                    }

                    mctx.save();
                    const r = Math.min(3, bw * 0.08, bh * 0.08);
                    mctx.beginPath();
                    mctx.roundRect(bx, by, bw, bh, r);
                    mctx.clip();
                    mctx.drawImage(img, sx, sy, sw, sh, bx, by, bw, bh);
                    mctx.restore();
                } else {
                    mctx.fillStyle = isSelected ? 'rgba(74, 222, 128, 0.45)' : 'rgba(99, 102, 241, 0.4)';
                    mctx.fillRect(bx, by, bw, bh);
                }

                // Subtle block outline
                mctx.strokeStyle = isSelected ? 'rgba(74, 222, 128, 0.6)' : 'rgba(255, 255, 255, 0.15)';
                mctx.lineWidth = 1;
                mctx.strokeRect(bx, by, bw, bh);
            });
        }

        // Sleek badge in bottom-right corner
        const badge = document.createElement('span');
        badge.className = `absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold pointer-events-none backdrop-blur-md shadow-sm ${
            isSelected 
                ? 'bg-accentGreen text-black ring-1 ring-accentGreen/80' 
                : 'bg-black/80 text-gray-200 group-hover:text-white border border-white/10'
        }`;
        badge.textContent = `${variant.cols}m`;

        card.appendChild(miniCanvas);
        card.appendChild(badge);

        card.onclick = () => {
            if (onSelect) onSelect(variant.sliderVal);
        };

        variantSuggestionsList.appendChild(card);
    });
}

let skeletonTilesMap = new Map();

/**
 * Initializes and displays the exact computed Bin Packing modular skeleton
 * in the workspace right after images are selected and their dimensions are probed.
 */
export function showRealGridSkeleton(placedBlocks, cols, totalRows) {
    if (!skeletonWorkspace || !skeletonBoard) return;

    skeletonBoard.innerHTML = '';
    skeletonTilesMap.clear();
    
    // Set exact collage aspect ratio for the board
    const safeCols = Math.max(1, cols);
    const safeRows = Math.max(1, totalRows);
    skeletonBoard.style.aspectRatio = `${safeCols} / ${safeRows}`;

    // Hide empty state and canvas wrapper, show workspace skeleton
    emptyState.classList.add('hidden');
    canvasWrapper.classList.add('hidden');
    skeletonWorkspace.classList.remove('hidden');

    const pad = 2; // subtle gap between skeleton cells

    placedBlocks.forEach((block) => {
        const tile = document.createElement('div');
        tile.className = 'skeleton-tile';
        
        const xPct = (block.gx / safeCols) * 100;
        const yPct = (block.gy / safeRows) * 100;
        const wPct = (block.gw / safeCols) * 100;
        const hPct = (block.gh / safeRows) * 100;

        tile.style.left = `calc(${xPct}% + ${pad}px)`;
        tile.style.top = `calc(${yPct}% + ${pad}px)`;
        tile.style.width = `calc(${wPct}% - ${pad * 2}px)`;
        tile.style.height = `calc(${hPct}% - ${pad * 2}px)`;

        skeletonBoard.appendChild(tile);
        skeletonTilesMap.set(block.origIndex, tile);
    });
}

/**
 * Gently highlights a specific skeleton tile when its corresponding image finishes conversion/loading.
 */
export function markSkeletonTileReady(origIndex) {
    const tile = skeletonTilesMap.get(origIndex);
    if (tile) {
        tile.classList.add('ready');
    }
}

export function hideSkeletonLoader() {
    if (!skeletonWorkspace) return;
    skeletonWorkspace.classList.add('hidden');
    if (skeletonBoard) skeletonBoard.innerHTML = '';
    skeletonTilesMap.clear();
}

