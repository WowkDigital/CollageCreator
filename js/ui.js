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
export const showMobilePreviewBtn = document.getElementById('showMobilePreviewBtn');

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
    const layout = document.querySelector('input[name="layout"]:checked').value;
    inputs.countLabel.textContent = layout === 'row' ? "Rows" : "Columns";
    document.getElementById('colCountVal').textContent = inputs.colCount.value;
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
