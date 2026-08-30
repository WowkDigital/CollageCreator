const MAX_THUMB_SIZE = 400;

export function createThumbnail(img) {
    return new Promise(resolve => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w <= MAX_THUMB_SIZE && h <= MAX_THUMB_SIZE) {
            resolve(img);
            return;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        const ratio = w / h;
        
        if (w > h) {
            canvas.width = MAX_THUMB_SIZE;
            canvas.height = Math.round(MAX_THUMB_SIZE / ratio);
        } else {
            canvas.height = MAX_THUMB_SIZE;
            canvas.width = Math.round(MAX_THUMB_SIZE * ratio);
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            if (!blob) {
                resolve(img);
                return;
            }
            const newImg = new Image();
            newImg.onload = () => resolve(newImg);
            newImg.onerror = () => resolve(img);
            newImg.src = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.82);
    });
}

export async function runConcurrent(items, limit, workerFn) {
    const results = new Array(items.length);
    let currentIndex = 0;

    const concurrency = Math.max(1, Math.min(limit, items.length));
    const workers = Array.from({ length: concurrency }, async () => {
        while (currentIndex < items.length) {
            const index = currentIndex++;
            results[index] = await workerFn(items[index], index);
        }
    });

    await Promise.all(workers);
    return results;
}

export function preventDefaults(e) { 
    e.preventDefault(); 
    e.stopPropagation(); 
}

export function highlight(dropZone, emptyState) {
    dropZone.classList.add('drag-active');
    if (emptyState) {
        emptyState.classList.add('drag-active');
        emptyState.style.borderColor = '#4ade80';
        emptyState.style.backgroundColor = 'rgba(74, 222, 128, 0.1)';
    }
}

export function unhighlight(dropZone, emptyState) {
    dropZone.classList.remove('drag-active');
    if (emptyState) {
        emptyState.classList.remove('drag-active');
        emptyState.style.borderColor = 'transparent';
        emptyState.style.backgroundColor = 'transparent';
    }
}

export function showToast(message, icon = 'check') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 text-accentGreen"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) container.remove();
    }, 3000);
}
