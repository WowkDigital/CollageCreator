/**
 * ImageProcessor - Utility for handling ARW (Sony Raw) files in the browser
 * by extracting the embedded JPEG preview.
 */
export const ImageProcessor = {
    // Quick probe for ARW dimensions & orientation without full canvas decode
    async getArwMetadata(file) {
        try {
            // Read initial 256KB of file to get TIFF header & IFD tags quickly
            const sliceSize = Math.min(file.size, 256 * 1024);
            const arrayBuffer = await file.slice(0, sliceSize).arrayBuffer();
            const tiffData = this.findJpegInArw(arrayBuffer);
            
            let orientation = tiffData.orientation || 1;
            // Default standard Sony raw 3:2 ratio
            let width = 6000;
            let height = 4000;

            if (orientation > 4 && orientation < 9) {
                return { width: height, height: width, ratio: height / width };
            }
            return { width, height, ratio: width / height };
        } catch (e) {
            return { width: 6000, height: 4000, ratio: 1.5 };
        }
    },

    // Main function called for an ARW file
    async convertArwToJpeg(file) { 
        const arrayBuffer = await file.arrayBuffer(); 
        const tiffData = this.findJpegInArw(arrayBuffer); 
        
        if (tiffData.offset > 0 && tiffData.length > 0) { 
            const jpegBuffer = arrayBuffer.slice(tiffData.offset, tiffData.offset + tiffData.length); 
            const blob = new Blob([jpegBuffer], { type: 'image/jpeg' }); 
            // Apply rotation based on EXIF to prevent incorrect orientation
            return await this.applyOrientation(blob, tiffData.orientation); 
        } else { 
            throw new Error('No JPEG preview found inside ARW file.'); 
        } 
    },

    // Parse TIFF/ARW structure looking for embedded JPEG
    findJpegInArw(arrayBuffer) { 
        const dataView = new DataView(arrayBuffer); 
        const isLittleEndian = dataView.getUint16(0, false) === 0x4949; // 'II' (Intel)
        
        if (dataView.getUint16(2, isLittleEndian) !== 42) throw new Error('Invalid TIFF file format.'); 
        
        let ifdOffset = dataView.getUint32(4, isLittleEndian); 
        let result = { offset: 0, length: 0, orientation: 1 }; 
        
        while (ifdOffset !== 0) { 
            const ifdResult = this.findDataInIfd(dataView, ifdOffset, isLittleEndian); 
            if (ifdResult.length > result.length) { 
                result = { ...result, ...ifdResult }; 
            } 
            if (ifdResult.orientation !== 1 && result.orientation === 1) { 
                result.orientation = ifdResult.orientation; 
            } 
            ifdOffset = ifdResult.nextIfdOffset; 
        } 
        return result; 
    },

    // Helper function to scan IFD directories
    findDataInIfd(dataView, ifdOffset, isLittleEndian) { 
        let jpegOffset = 0, jpegLength = 0, orientation = 1; 
        const numEntries = dataView.getUint16(ifdOffset, isLittleEndian); 
        
        for (let i = 0; i < numEntries; i++) { 
            const entryOffset = ifdOffset + 2 + (i * 12); 
            const tag = dataView.getUint16(entryOffset, isLittleEndian); 
            
            // SubIFDs tag
            if (tag === 0x014A) { 
                const subIfdOffset = dataView.getUint32(entryOffset + 8, isLittleEndian); 
                const subResult = this.findDataInIfd(dataView, subIfdOffset, isLittleEndian); 
                if (subResult.length > jpegLength) { 
                    jpegOffset = subResult.offset; 
                    jpegLength = subResult.length; 
                    if (subResult.orientation !== 1) orientation = subResult.orientation; 
                } 
            } 
            
            if (tag === 0x0201) jpegOffset = dataView.getUint32(entryOffset + 8, isLittleEndian); 
            if (tag === 0x0202) jpegLength = dataView.getUint32(entryOffset + 8, isLittleEndian); 
            if (tag === 0x0112) orientation = dataView.getUint16(entryOffset + 8, isLittleEndian); 
        } 
        
        const nextIfdOffset = dataView.getUint32(ifdOffset + 2 + (numEntries * 12), isLittleEndian); 
        return { offset: jpegOffset, length: jpegLength, orientation: orientation, nextIfdOffset: nextIfdOffset }; 
    },

    // Image rotation on Canvas based on Orientation flag
    async applyOrientation(imageBlob, orientation) {
        if (orientation === 1) return imageBlob;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;

                if (orientation > 4 && orientation < 9) {
                    canvas.width = height;
                    canvas.height = width;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                switch (orientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                }

                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(imageBlob);
        });
    }
};
