// lib/utils.ts

// Initialize PDF.js worker for thumbnail generation
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

if (typeof window !== 'undefined') {
    import('pdfjs-dist').then((pdfjs) => {
        pdfjsLib = pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }).catch((error: unknown) => {
        console.error('Failed to load PDF.js:', error);
    });
}

/**
 * Generate thumbnail from PDF data (base64)
 */
export async function generateThumbnail(pdfData: string): Promise<string | null> {
    if (!pdfjsLib) return null;

    try {
        const loadingTask = await pdfjsLib.getDocument({ data: atob(pdfData) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) return null;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL();
    } catch (error: unknown) {
        console.error('Thumbnail generation error:', error);
        return null;
    }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}