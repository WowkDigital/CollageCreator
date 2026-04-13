import * as ui from './ui.js';
import { renderCollage } from './collage.js';
import * as utils from './utils.js';

// State
let images = [];
let renderTimeout;

// Initialization
lucide.createIcons();

const triggerRender = () => {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => renderCollage(images, false, ui.canvas, ui.ctx, ui.inputs), 20);
};

// --- Handlers ---

async function handleFiles(e) {
    const files = e.target.files ? [...e.target.files] : [...e.dataTransfer.files];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    ui.processingIndicator.classList.remove('hidden');
    let loadedCount = 0;
    const total = imageFiles.length;
    ui.loaderCount.textContent = `0 / ${total}`;

    for (const file of imageFiles) {
        await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    const thumbImg = await utils.createThumbnail(img);
                    images.push({
                        id: Date.now() + Math.random(),
                        original: img,
                        thumb: thumbImg, 
                        src: img.src
                    });
                    loadedCount++;
                    ui.loaderCount.textContent = `${loadedCount} / ${total}`;
                    resolve();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    ui.processingIndicator.classList.add('hidden');
    ui.updateUI(images);
    renderThumbnailsList();
    triggerRender();
    ui.fileInput.value = '';
}

function renderThumbnailsList() {
    ui.renderThumbnails(
        images, 
        (index) => {
            images.splice(index, 1);
            ui.updateUI(images);
            renderThumbnailsList();
            triggerRender();
        },
        null,
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
    renderThumbnailsList();
    triggerRender();
}

// --- Event Listeners ---

ui.dropZone.addEventListener('click', () => ui.fileInput.click());
ui.fileInput.addEventListener('change', handleFiles);

ui.shuffleBtn.addEventListener('click', () => {
    images.sort(() => Math.random() - 0.5);
    renderThumbnailsList();
    triggerRender();
});

window.setBg = (color) => {
    ui.inputs.bgColor.value = color;
    ui.inputs.bgColor.dispatchEvent(new Event('input'));
};

const dragTargets = [ui.dropZone, document.body, ui.emptyState];
dragTargets.forEach(target => {
    target.addEventListener('dragenter', utils.preventDefaults, false);
    target.addEventListener('dragover', (e) => {
        utils.preventDefaults(e);
        utils.highlight(ui.dropZone, ui.emptyState);
    }, false);
    target.addEventListener('dragleave', (e) => {
        utils.preventDefaults(e);
        utils.unhighlight(ui.dropZone, ui.emptyState);
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
        input.forEach(r => r.addEventListener('change', () => { 
            ui.updateValueDisplays(); 
            triggerRender(); 
        }));
    } else if (input instanceof HTMLElement) {
        input.addEventListener('input', () => { 
            ui.updateValueDisplays(); 
            triggerRender(); 
        });
    }
});

ui.resetBtn.addEventListener('click', () => {
    if(confirm('Delete everything and start over?')) {
        images = [];
        ui.fileInput.value = '';
        ui.resultWrapper.classList.add('hidden');
        ui.canvasWrapper.classList.add('hidden');
        ui.updateUI(images);
        renderThumbnailsList();
        renderCollage(images, false, ui.canvas, ui.ctx, ui.inputs);
    }
});

ui.generateBtn.addEventListener('click', async () => {
    ui.processingIndicator.classList.remove('hidden');
    
    const maxPerCollage = parseInt(ui.inputs.maxImages.value) || 0;
    let chunks = [];
    
    if (maxPerCollage > 0) {
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
