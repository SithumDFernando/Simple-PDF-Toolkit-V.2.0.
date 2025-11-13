// lib/types.ts

export interface Page {
    id: string;
    pageNumber: number;
    fileName: string;
    sectionId: string;
    pdfData: string;
    thumbnail: string | null;
}

export interface Section {
    id: string;
    name: string;
    pageIds: string[];
}

export interface PDFExtractResponse {
    success: boolean;
    fileName: string;
    pageCount: number;
    pages: Array<{
        id: string;
        pageNumber: number;
        fileName: string;
        pdfData: string;
        thumbnail: null;
    }>;
}