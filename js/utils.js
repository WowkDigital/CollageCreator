const MAX_THUMB_SIZE = 400;

export function createThumbnail(img) {
    return new Promise(resolve => {
        if (img.width <= MAX_THUMB_SIZE && img.height <= MAX_THUMB_SIZE) {
            resolve(img);
            return;
        }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const ratio = img.width / img.height;
        
        if (img.width > img.height) {
            canvas.width = MAX_THUMB_SIZE;
            canvas.height = MAX_THUMB_SIZE / ratio;
        } else {
            canvas.height = MAX_THUMB_SIZE;
            canvas.width = MAX_THUMB_SIZE * ratio;
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const newImg = new Image();
        newImg.onload = () => resolve(newImg);
        newImg.src = canvas.toDataURL();
    });
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
