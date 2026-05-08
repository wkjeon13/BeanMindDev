/**
 * Image Processing Utilities
 */

/**
 * Compresses and resizes an image file using HTML5 Canvas API.
 * 
 * @param file The original image file from the input element
 * @param maxWidth The maximum width of the output image (default: 512)
 * @param maxHeight The maximum height of the output image (default: 512)
 * @param quality The image quality between 0 and 1 (default: 0.8)
 * @returns A Promise that resolves to a Base64 string of the compressed image
 */
export const compressImage = (file: File, maxWidth: number = 512, maxHeight: number = 512, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate the new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context is not available'));
                    return;
                }

                // Fill background with white in case of transparent PNG to JPEG conversion
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, 0, 0, width, height);

                // Export to JPEG with specified quality
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };

            img.onerror = (error) => reject(error);
        };

        reader.onerror = (error) => reject(error);
    });
};
