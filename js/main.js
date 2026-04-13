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
    ui.loaderCount.textContent = "Generating high quality...";
    
    await new Promise(r => setTimeout(r, 50));
    await renderCollage(images, true, ui.canvas, ui.ctx, ui.inputs);
    
    const format = ui.inputs.format.value;
    const quality = format === 'image/jpeg' ? 0.95 : undefined;
    const dataUrl = ui.canvas.toDataURL(format, quality);
    
    ui.resultImage.src = dataUrl;
    ui.canvasWrapper.classList.add('hidden');
    ui.resultWrapper.classList.remove('hidden');
    ui.infoBar.classList.add('hidden');
    
    ui.downloadLinkBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `collage-${Date.now()}.${format.split('/')[1]}`;
        link.href = dataUrl;
        link.click();
    };

    ui.copyBtn.onclick = async () => {
        ui.canvas.toBlob(async (blob) => {
            if (!blob) return;
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                const originalText = ui.copyBtn.innerHTML;
                ui.copyBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Copied!';
                lucide.createIcons();
                setTimeout(() => {
                    ui.copyBtn.innerHTML = originalText;
                    lucide.createIcons();
                }, 2000);
            } catch (err) {
                console.error(err);
            }
        }, 'image/png');
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
