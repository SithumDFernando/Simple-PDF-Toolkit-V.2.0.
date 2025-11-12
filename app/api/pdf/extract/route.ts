// ============================================
// FILE: app/api/pdf/extract/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('pdf') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No PDF file provided' },
                { status: 400 }
            );
        }

        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        const pageCount = pdfDoc.getPageCount();
        const pages = [];

        // Extract each page as a separate PDF and convert to base64
        for (let i = 0; i < pageCount; i++) {
            const singlePageDoc = await PDFDocument.create();
            const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
            singlePageDoc.addPage(copiedPage);

            // Convert to base64 for thumbnail generation
            const pdfBytes = await singlePageDoc.save();
            const base64 = Buffer.from(pdfBytes).toString('base64');

            pages.push({
                id: `${Date.now()}-${i}-${Math.random()}`,
                pageNumber: i + 1,
                fileName: file.name,
                pdfData: base64, // Store the page PDF data
                thumbnail: null // Frontend can generate thumbnail using pdf.js
            });
        }

        return NextResponse.json({
            success: true,
            fileName: file.name,
            pageCount,
            pages
        });

    } catch (error) {
        console.error('PDF extraction error:', error);
        return NextResponse.json(
            { error: 'Failed to extract PDF pages', details: error.message },
            { status: 500 }
        );
    }
}
