import * as ui from './ui.js';
import { renderCollage, generateBinPackingVariants, solveModularPacking } from './collage.js';
import * as utils from './utils.js';
import { ImageProcessor } from './arw-processor.js';

// State
let images = [];
let renderTimeout;

// Initialization
lucide.createIcons();
ui.updateValueDisplays();

const updateVariantsUI = (autoSelectBest = false, deepOptimization = false) => {
    const layout = document.querySelector('input[name="layout"]:checked')?.value || 'bin-packing';
    if (layout === 'bin-packing' && images.length > 0) {
        try {
            const variants = generateBinPackingVariants(images, deepOptimization);
            if (autoSelectBest && variants.length > 0) {
                // Auto-select #1 best variant (closest to square & gapless)
                ui.inputs.colCount.value = variants[0].sliderVal;
                ui.updateValueDisplays();
            }
            ui.renderVariantSuggestions(variants, (newSliderVal) => {
                ui.inputs.colCount.value = newSliderVal;
                ui.updateValueDisplays();
                triggerRender();
            });
        } catch (err) {
            console.error('Error generating variants:', err);
        }
    } else {
        ui.variantSuggestionsList.innerHTML = '';
        ui.variantsFoundBadge.classList.add('hidden');
    }
};

if (ui.deepOptimizeBtn) {
    ui.deepOptimizeBtn.addEventListener('click', async () => {
        if (images.length === 0) {
            utils.showToast('Wgraj zdjęcia, aby przeprowadzić obliczenia', 'alert-circle');
            return;
        }

        const origHtml = ui.deepOptimizeBtnText.textContent;
        ui.deepOptimizeBtn.disabled = true;
        ui.deepOptimizeBtn.classList.add('opacity-75', 'cursor-wait');
        ui.deepOptimizeBtnText.textContent = 'Trwają głębokie obliczenia...';

        // Allow UI to repaint
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            updateVariantsUI(true, true);
            triggerRender();
            utils.showToast('Zakończono głębokie obliczenia siatki!', 'sparkles');
        } catch (err) {
            console.error('Deep optimize error:', err);
        } finally {
            ui.deepOptimizeBtn.disabled = false;
            ui.deepOptimizeBtn.classList.remove('opacity-75', 'cursor-wait');
            ui.deepOptimizeBtnText.textContent = origHtml;
            lucide.createIcons();
        }
    });
}

const triggerRender = () => {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(async () => {
        try {
            await renderCollage(images, false, ui.canvas, ui.ctx, ui.inputs);
        } catch (err) {
            console.error('Error in renderCollage:', err);
        }
        updateVariantsUI(false);
    }, 20);
};

// Initial state
updateVariantsUI();

// --- Handlers ---

async function handleFiles(e) {
    const files = e.target.files ? [...e.target.files] : [...e.dataTransfer.files];
    // Include .arw files in the selection
    const eligibleFiles = files.filter(f => 
        f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.arw')
    );
    
    if (eligibleFiles.length === 0) return;

    // 1. FAST PROBE: Immediately extract Width, Height & Ratio for each selected file
    const metaProbePromises = eligibleFiles.map(async (file, origIndex) => {
        const isArw = file.name.toLowerCase().endsWith('.arw');
        if (isArw) {
            const meta = await ImageProcessor.getArwMetadata(file);
            return { origIndex, file, isArw: true, width: meta.width, height: meta.height, ratio: meta.ratio };
        } else {
            // Standard image - quickly probe dimensions via lightweight Image/ObjectUrl
            return new Promise(resolve => {
                const objectUrl = URL.createObjectURL(file);
                const tempImg = new Image();
                tempImg.onload = () => {
                    const w = tempImg.naturalWidth || 1200;
                    const h = tempImg.naturalHeight || 800;
                    URL.revokeObjectURL(objectUrl);
                    resolve({ origIndex, file, isArw: false, width: w, height: h, ratio: w / h, tempObjectUrl: null });
                };
                tempImg.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve({ origIndex, file, isArw: false, width: 1200, height: 800, ratio: 1.5 });
                };
                tempImg.src = objectUrl;
            });
        }
    });

    const fileMetaList = await Promise.all(metaProbePromises);

    // 2. REAL CALCULATIONS: Calculate real Bin Packing optimal variants immediately
    let initialVariants = [];
    try {
        initialVariants = generateBinPackingVariants(fileMetaList);
    } catch (err) {
        console.error('Error generating initial variants from dimensions:', err);
    }

    const bestVariant = (initialVariants && initialVariants.length > 0) ? initialVariants[0] : null;
    const initialCols = bestVariant ? bestVariant.cols : 8;
    const initialSolution = solveModularPacking(fileMetaList, initialCols);

    // 3. DRAW REAL SKELETON: Draw exact modular grid skeleton immediately in workspace
    if (initialSolution && initialSolution.placed && initialSolution.placed.length > 0) {
        ui.showRealGridSkeleton(initialSolution.placed, initialSolution.effectiveCols, initialSolution.totalRows);
    }

    // 4. CONCURRENT FULL CONVERSION & PROCESSING
    const concurrency = Math.max(2, Math.min(navigator.hardwareConcurrency || 3, 4));

    const processedResults = await utils.runConcurrent(fileMetaList, concurrency, async (meta, workerIndex) => {
        const file = meta.file;
        const origIndex = meta.origIndex;

        try {
            let processedFile = file;

            if (meta.isArw) {
                if (ui.loaderCount) ui.loaderCount.textContent = `Konwersja ARW: ${file.name}...`;
                const jpegBlob = await ImageProcessor.convertArwToJpeg(file);
                processedFile = new File([jpegBlob], file.name.replace(/\.arw$/i, '.jpg'), { type: 'image/jpeg' });
            }

            const objectUrl = URL.createObjectURL(processedFile);
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error(`Failed to decode image: ${file.name}`));
                };
                image.src = objectUrl;
            });

            const thumbImg = await utils.createThumbnail(img);
            
            // 5. GENTLY HIGHLIGHT: Light up the corresponding skeleton tile as soon as converted
            ui.markSkeletonTileReady(origIndex);

            return {
                id: Date.now() + Math.random(),
                original: img,
                thumb: thumbImg, 
                src: img.src,
                name: processedFile.name,
                date: file.lastModified
            };
        } catch (err) {
            console.error('Error processing file:', file.name, err);
            utils.showToast(`Błąd: ${file.name}`, 'alert-circle');
            return null;
        }
    });

    const validImages = processedResults.filter(Boolean);
    images.push(...validImages);

    // Small graceful pause so user can see completion before final render transition
    await new Promise(resolve => setTimeout(resolve, 200));

    ui.hideSkeletonLoader();

    ui.updateUI(images);
    syncSplitInputs();
    renderThumbnailsList();
    updateVariantsUI(true);
    triggerRender();

    if (validImages.length > 0) {
        utils.showToast(`Wczytano ${validImages.length} ${validImages.length === 1 ? 'zdjęcie' : 'zdjęć'}`, 'image');
    }
    ui.fileInput.value = '';
    if (ui.emptyStateFileInput) ui.emptyStateFileInput.value = '';
}


function renderThumbnailsList() {
    ui.renderThumbnails(
        images, 
        (index) => {
            const [removed] = images.splice(index, 1);
            if (removed?.src?.startsWith('blob:')) URL.revokeObjectURL(removed.src);
            if (removed?.thumb?.src?.startsWith('blob:')) URL.revokeObjectURL(removed.thumb.src);
            ui.updateUI(images);
            syncSplitInputs();
            renderThumbnailsList();
            triggerRender();
        },
        (fromIndex, toIndex) => {
            const [movedItem] = images.splice(fromIndex, 1);
            images.splice(toIndex, 0, movedItem);
            renderThumbnailsList();
            triggerRender();
        },
        reorderImages
    );
}

function reorderImages() {
    const newImages = [];
    [...ui.thumbnailsList.children].forEach(child => {
        const oldIndex = parseInt(child.dataset.index);
        newImages.push(images[oldIndex]);
    });
    images = newImages;
    syncSplitInputs();
    renderThumbnailsList();
    triggerRender();
}

function syncSplitInputs() {
    const max = parseInt(ui.inputs.maxImages.value) || 0;
    if (max > 0 && images.length > 0) {
        ui.inputs.collageCount.value = Math.ceil(images.length / max);
    } else if (images.length === 0) {
        ui.inputs.collageCount.value = 0;
        ui.inputs.maxImages.value = 0;
    }
}

// --- Event Listeners ---

if (ui.toggleMobilePreviewBtn) {
    const updatePreviewState = (hide) => {
        if (hide) {
            ui.previewMain.classList.add('hidden');
            if (ui.mobileShowPreviewBanner) ui.mobileShowPreviewBanner.classList.remove('hidden');
            ui.togglePreviewText.textContent = 'Show Preview';
            ui.togglePreviewIcon.setAttribute('data-lucide', 'eye');
        } else {
            ui.previewMain.classList.remove('hidden');
            if (ui.mobileShowPreviewBanner) ui.mobileShowPreviewBanner.classList.add('hidden');
            ui.togglePreviewText.textContent = 'Hide Preview';
            ui.togglePreviewIcon.setAttribute('data-lucide', 'eye-off');
        }
        lucide.createIcons();
    };

    let isPreviewHidden = false;
    ui.toggleMobilePreviewBtn.addEventListener('click', () => {
        isPreviewHidden = !isPreviewHidden;
        updatePreviewState(isPreviewHidden);
    });

    if (ui.showMobilePreviewBtn) {
        ui.showMobilePreviewBtn.addEventListener('click', () => {
            isPreviewHidden = false;
            updatePreviewState(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

if (ui.emptyState) {
    ui.emptyState.addEventListener('click', (e) => {
        // Trigger file input dialog
        if (ui.emptyStateFileInput) {
            ui.emptyStateFileInput.click();
        } else {
            ui.fileInput.click();
        }
    });
}

if (ui.emptyStateFileInput) {
    ui.emptyStateFileInput.addEventListener('change', handleFiles);
}

ui.dropZone.addEventListener('click', () => ui.fileInput.click());
ui.fileInput.addEventListener('change', handleFiles);

ui.shuffleBtn.addEventListener('click', () => {
    images.sort(() => Math.random() - 0.5);
    renderThumbnailsList();
    triggerRender();
    utils.showToast('Shuffled images', 'shuffle');
});

ui.sortAlphaBtn.addEventListener('click', () => {
    images.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
    renderThumbnailsList();
    triggerRender();
    utils.showToast('Sorted A-Z', 'sort-asc');
});

ui.sortDateBtn.addEventListener('click', () => {
    images.sort((a, b) => a.date - b.date);
    renderThumbnailsList();
    triggerRender();
    utils.showToast('Sorted by date', 'calendar');
});

window.setBg = (color) => {
    ui.inputs.bgColor.value = color;
    ui.inputs.bgColor.dispatchEvent(new Event('input'));
};

const dragTargets = [ui.dropZone, document.body, ui.emptyState];
dragTargets.forEach(target => {
    if (!target) return;
    target.addEventListener('dragenter', utils.preventDefaults, false);
    target.addEventListener('dragover', (e) => {
        utils.preventDefaults(e);
        utils.highlight(ui.dropZone, ui.emptyState);
    }, false);
    target.addEventListener('dragleave', (e) => {
        utils.preventDefaults(e);
        // Only unhighlight when leaving window or main element
        if (e.relatedTarget === null || e.target === document.body || e.target === ui.emptyState) {
            utils.unhighlight(ui.dropZone, ui.emptyState);
        }
    }, false);
    target.addEventListener('drop', (e) => {
        utils.preventDefaults(e);
        utils.unhighlight(ui.dropZone, ui.emptyState);
        handleFiles(e);
    }, false);
});

// Settings Live Update
Object.values(ui.inputs).forEach(input => {
    if (input instanceof NodeList) {
        input.forEach(r => r.addEventListener('change', (e) => { 
            // Layout specific presets
            if (e.target.name === 'layout' && e.target.value === 'square') {
                ui.inputs.gapSize.value = 0;
                ui.inputs.radiusSize.value = 0;
                ui.inputs.gridWeight.value = 5;
                ui.inputs.gridColor.value = '#000000';
            } else if (e.target.name === 'layout' && e.target.value === 'bin-packing') {
                updateVariantsUI(true);
            }
            ui.updateValueDisplays(); 
            triggerRender(); 
        }));
    } else if (input instanceof HTMLElement) {
        input.addEventListener('input', (e) => { 
            // Sync splitting logic
            if (images.length > 0) {
                if (e.target.id === 'maxImagesPerCollage') {
                    const max = parseInt(e.target.value) || 0;
                    ui.inputs.collageCount.value = max > 0 ? Math.ceil(images.length / max) : 0;
                } else if (e.target.id === 'collageCount') {
                    const count = parseInt(e.target.value) || 0;
                    ui.inputs.maxImages.value = count > 0 ? Math.ceil(images.length / count) : 0;
                }
            }
            ui.updateValueDisplays(); 
            triggerRender(); 
        });
    }
});

ui.resetBtn.addEventListener('click', () => {
    if (confirm('Delete everything and start over?')) {
        images.forEach(img => {
            if (img?.src?.startsWith('blob:')) URL.revokeObjectURL(img.src);
            if (img?.thumb?.src?.startsWith('blob:')) URL.revokeObjectURL(img.thumb.src);
        });
        images.length = 0; // Clear the array in place
        ui.fileInput.value = '';
        ui.resultWrapper.classList.add('hidden');
        ui.canvasWrapper.classList.add('hidden');
        ui.updateUI(images);
        renderThumbnailsList();
        renderCollage(images, false, ui.canvas, ui.ctx, ui.inputs);
        utils.showToast('Reset successful');
    }
});

ui.toggleImagesBtn.addEventListener('click', () => {
    const isHidden = ui.imagesManagementWrapper.classList.toggle('hidden');
    ui.imagesChevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
});

ui.generateBtn.addEventListener('click', async () => {
    ui.processingIndicator.classList.remove('hidden');
    
    const maxPerCollage = parseInt(ui.inputs.maxImages.value) || 0;
    const fixedCount = parseInt(ui.inputs.collageCount.value) || 0;
    let chunks = [];
    
    if (fixedCount > 0) {
        // Split as evenly as possible into N collages
        const parts = Math.min(fixedCount, images.length);
        let start = 0;
        for (let i = 0; i < parts; i++) {
            const size = Math.floor(images.length / parts) + (i < (images.length % parts) ? 1 : 0);
            if (size > 0) {
                chunks.push(images.slice(start, start + size));
                start += size;
            }
        }
    } else if (maxPerCollage > 0) {
        for (let i = 0; i < images.length; i += maxPerCollage) {
            chunks.push(images.slice(i, i + maxPerCollage));
        }
    } else {
        chunks = [images];
    }

    ui.resultsList.innerHTML = '';
    const generatedDataUrls = [];

    for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        ui.loaderCount.textContent = `Generating collage ${index + 1} of ${chunks.length}...`;
        
        await new Promise(r => setTimeout(r, 50));
        await renderCollage(chunk, true, ui.canvas, ui.ctx, ui.inputs);
        
        const format = ui.inputs.format.value;
        const quality = format === 'image/jpeg' ? 0.95 : undefined;
        const dataUrl = ui.canvas.toDataURL(format, quality);
        generatedDataUrls.push(dataUrl);

        // UI for each result
        const resultItem = document.createElement('div');
        resultItem.className = 'flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500 w-full mb-4';
        
        const squareWrapper = document.createElement('div');
        squareWrapper.className = 'w-full aspect-square bg-bgDark rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center result-image-container relative group';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.className = 'w-full h-full object-contain cursor-zoom-in transition-transform duration-500 group-hover:scale-105';
        img.onclick = () => window.open(dataUrl, '_blank');
        
        squareWrapper.appendChild(img);
        
        const label = document.createElement('span');
        label.className = 'text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-1';
        label.textContent = `Collage #${index + 1} • ${chunk.length} imgs`;

        const btnRow = document.createElement('div');
        btnRow.className = 'flex gap-2 mt-1';

        const dlBtn = document.createElement('button');
        dlBtn.className = 'bg-accent/20 hover:bg-accent text-accentGreen hover:text-white px-3 py-1 rounded-md text-xs transition flex items-center gap-1.5 border border-accent/30';
        dlBtn.innerHTML = '<i data-lucide="download" class="w-3 h-3"></i> Save';
        dlBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `collage-${index + 1}-${Date.now()}.${format.split('/')[1]}`;
            link.href = dataUrl;
            link.click();
        };

        const cpBtn = document.createElement('button');
        cpBtn.className = 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1 rounded-md text-xs transition flex items-center gap-1.5 border border-gray-600';
        cpBtn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i> Copy';
        cpBtn.onclick = async () => {
            try {
                // To ensure maximum clipboard compatibility, we always copy as PNG
                const imgTemp = new Image();
                imgTemp.src = dataUrl;
                await imgTemp.decode();
                
                const canvasTemp = document.createElement('canvas');
                canvasTemp.width = imgTemp.naturalWidth;
                canvasTemp.height = imgTemp.naturalHeight;
                const ctxTemp = canvasTemp.getContext('2d');
                ctxTemp.drawImage(imgTemp, 0, 0);
                
                canvasTemp.toBlob(async (blob) => {
                    if (navigator.clipboard && window.ClipboardItem) {
                        const data = [new ClipboardItem({ 'image/png': blob })];
                        await navigator.clipboard.write(data);
                        utils.showToast('Copied to clipboard!');
                    } else {
                        utils.showToast('Clipboard API not supported here.', 'alert-circle');
                    }
                }, 'image/png');
            } catch (err) { 
                console.error(err); 
                utils.showToast('Copy failed. Check permissions.', 'alert-circle');
            }
        };

        btnRow.appendChild(dlBtn);
        btnRow.appendChild(cpBtn);
        resultItem.appendChild(squareWrapper);
        resultItem.appendChild(label);
        resultItem.appendChild(btnRow);
        ui.resultsList.appendChild(resultItem);
    }
    
    lucide.createIcons();

    ui.canvasWrapper.classList.add('hidden');
    ui.resultWrapper.classList.remove('hidden');
    ui.infoBar.classList.add('hidden');
    
    ui.downloadAllBtn.onclick = () => {
        generatedDataUrls.forEach((url, i) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `collage-${i + 1}-${Date.now()}.${ui.inputs.format.value.split('/')[1]}`;
                link.href = url;
                link.click();
            }, i * 300); // Small delay to avoid browser blocking multiple downloads
        });
        utils.showToast(`Downloading ${generatedDataUrls.length} images...`);
    };

    ui.processingIndicator.classList.add('hidden');
});

ui.backToEditBtn.addEventListener('click', () => {
    ui.resultWrapper.classList.add('hidden');
    ui.canvasWrapper.classList.remove('hidden');
    ui.infoBar.classList.remove('hidden');
    triggerRender();
});

ui.thumbnailsList.addEventListener('dragover', e => {
    e.preventDefault();
    const draggable = document.querySelector('.dragging');
    const target = e.target.closest('.thumbnail-item');
    if (target && target !== draggable) {
        const children = [...ui.thumbnailsList.children];
        const currentIndex = children.indexOf(draggable);
        const targetIndex = children.indexOf(target);
        if (currentIndex < targetIndex) {
            ui.thumbnailsList.insertBefore(draggable, target.nextSibling);
        } else {
            ui.thumbnailsList.insertBefore(draggable, target);
        }
    }
});

// Initial logic
ui.updateValueDisplays();
ui.updateUI(images);
