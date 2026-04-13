// --- DOM Elements ---
export const dropZone = document.getElementById('dropZone');
export const emptyState = document.getElementById('emptyState');
export const fileInput = document.getElementById('imageUpload');
export const thumbnailsList = document.getElementById('thumbnailsList');
export const settingsSection = document.getElementById('settingsSection');
export const canvasWrapper = document.getElementById('canvasWrapper');
export const canvas = document.getElementById('mainCanvas');
export const ctx = canvas.getContext('2d');
export const generateBtn = document.getElementById('generateBtn');
export const resetBtn = document.getElementById('resetBtn');
export const shuffleBtn = document.getElementById('shuffleBtn');
export const infoBar = document.getElementById('infoBar');
export const imgCountSpan = document.getElementById('imgCount');
export const processingIndicator = document.getElementById('processingIndicator');
export const loaderCount = document.getElementById('loaderCount');
export const resultWrapper = document.getElementById('resultWrapper');
export const resultImage = document.getElementById('resultImage');
export const downloadLinkBtn = document.getElementById('downloadLinkBtn');
export const copyBtn = document.getElementById('copyBtn');
export const backToEditBtn = document.getElementById('backToEditBtn');

// Inputs
export const inputs = {
    layout: document.getElementsByName('layout'),
    colCount: document.getElementById('colCount'),
    countLabel: document.getElementById('countLabel'),
    gapSize: document.getElementById('gapSize'),
    radiusSize: document.getElementById('radiusSize'),
    bgColor: document.getElementById('bgColor'),
    canvasWidth: document.getElementById('canvasWidth'),
    format: document.getElementById('exportFormat')
};

export function updateUI(images) {
    imgCountSpan.textContent = images.length;
    
    if (images.length > 0) {
        settingsSection.classList.remove('opacity-50', 'pointer-events-none');
        thumbnailsList.parentElement.classList.remove('hidden');
        emptyState.classList.add('hidden');
        canvasWrapper.classList.remove('hidden');
        generateBtn.disabled = false;
        infoBar.classList.remove('hidden');
    } else {
        settingsSection.classList.add('opacity-50', 'pointer-events-none');
        thumbnailsList.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        canvasWrapper.classList.add('hidden');
        generateBtn.disabled = true;
        infoBar.classList.add('hidden');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

export function renderThumbnails(images, deleteCallback, startDragCallback, endDragCallback) {
    thumbnailsList.innerHTML = '';
    images.forEach((imgObj, index) => {
        const div = document.createElement('div');
        div.className = 'relative w-full aspect-square rounded-md overflow-hidden cursor-move border border-gray-600 bg-gray-800 thumbnail-item';
        div.draggable = true;
        div.dataset.index = index;

        const thumb = document.createElement('img');
        thumb.src = imgObj.thumb.src;
        thumb.className = 'w-full h-full object-cover pointer-events-none';
        
        const btn = document.createElement('button');
        btn.className = 'absolute top-0 right-0 bg-black/60 text-white p-1 hover:bg-red-500 transition-colors backdrop-blur-sm rounded-bl-md';
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteCallback(index);
        };

        div.appendChild(thumb);
        div.appendChild(btn);
        
        div.addEventListener('dragstart', () => {
            div.classList.add('dragging');
            if (startDragCallback) startDragCallback(div);
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            if (endDragCallback) endDragCallback();
        });
        
        thumbnailsList.appendChild(div);
    });
}

export function updateValueDisplays() {
    const layout = document.querySelector('input[name="layout"]:checked').value;
    inputs.countLabel.textContent = layout === 'row' ? "Rows" : "Columns";
    document.getElementById('colCountVal').textContent = inputs.colCount.value;
    document.getElementById('gapVal').textContent = inputs.gapSize.value;
    document.getElementById('radiusVal').textContent = inputs.radiusSize.value;
}
