import { ImageProcessor } from './arw-processor.js';

// UI Logic
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const processingView = document.getElementById('processing-view');
const fileList = document.getElementById('file-list');
const totalCountEl = document.getElementById('total-count');
const progressPercentEl = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

let filesToProcess = [];
const zip = new JSZip();

// Initialize Icons
lucide.createIcons();

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

resetBtn.addEventListener('click', () => {
    location.reload();
});

async function handleFiles(files) {
    const arwFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.arw'));
    
    if (arwFiles.length === 0) {
        alert('Proszę wybrać pliki .ARW');
        return;
    }

    filesToProcess = arwFiles;
    dropZone.classList.add('hidden');
    processingView.classList.remove('hidden');
    totalCountEl.textContent = filesToProcess.length;

    processNext();
}

async function processNext() {
    let completedCount = 0;

    for (const file of filesToProcess) {
        const itemEl = createFileListItem(file.name);
        fileList.appendChild(itemEl);
        // Scroll to newest
        itemEl.scrollIntoView({ behavior: 'smooth', block: 'end' });

        try {
            const jpegBlob = await ImageProcessor.convertArwToJpeg(file);
            const jpgName = file.name.replace(/\.arw$/i, '.jpg');
            
            zip.file(jpgName, jpegBlob);
            
            updateFileStatus(itemEl, 'Gotowe', 'status-done', 'check-circle');
            completedCount++;
        } catch (error) {
            console.error(error);
            updateFileStatus(itemEl, 'Błąd', 'status-error', 'alert-circle');
        }

        const percent = Math.round((completedCount / filesToProcess.length) * 100);
        progressPercentEl.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
    }

    downloadBtn.disabled = false;
    lucide.createIcons();
}

function createFileListItem(name) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
        <div class="file-info">
            <i data-lucide="image" class="w-5 h-5 text-slate-500"></i>
            <span class="file-name text-slate-300">${name}</span>
        </div>
        <div class="file-status status-wait">
            <i data-lucide="loader" class="w-4 h-4 spin text-accent"></i>
            <span class="text-xs">Przetwarzanie...</span>
        </div>
    `;
    lucide.createIcons();
    return div;
}

function updateFileStatus(element, text, className, iconName) {
    const statusDiv = element.querySelector('.file-status');
    statusDiv.className = `file-status ${className}`;
    statusDiv.innerHTML = `
        <i data-lucide="${iconName}" class="w-4 h-4"></i>
        <span>${text}</span>
    `;
    lucide.createIcons();
}

downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 spin"></i> Generowanie ZIP...';
    lucide.createIcons();

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `arw_jpg_export_${new Date().getTime()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Błąd podczas generowania pliku ZIP.');
    }

    downloadBtn.disabled = false;
    downloadBtn.innerHTML = originalContent;
    lucide.createIcons();
});
