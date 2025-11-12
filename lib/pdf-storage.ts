// ============================================
// FILE: lib/pdf-storage.ts (Optional: Server-side storage)
// ============================================
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Ensure upload directory exists
export async function ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

// Save PDF to server temporarily
export async function savePdfToServer(fileName: string, data: Buffer): Promise<string> {
    await ensureUploadDir();
    const filePath = join(UPLOAD_DIR, `${Date.now()}-${fileName}`);
    await writeFile(filePath, data);
    return filePath;
}

// Read PDF from server
export async function readPdfFromServer(filePath: string): Promise<Buffer> {
    return await readFile(filePath);
}