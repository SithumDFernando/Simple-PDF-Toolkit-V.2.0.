// ============================================
// FILE: app/api/pdf/merge/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pages } = body; // Array of page objects with pdfData (base64)

        if (!pages || pages.length === 0) {
            return NextResponse.json(
                { error: 'No pages provided for merging' },
                { status: 400 }
            );
        }

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Add each page to the merged document
        for (const page of pages) {
            try {
                // Decode base64 to buffer
                const pdfBytes = Buffer.from(page.pdfData, 'base64');
                const pageDoc = await PDFDocument.load(pdfBytes);

                // Copy all pages from this document
                const copiedPages = await mergedPdf.copyPages(pageDoc, pageDoc.getPageIndices());
                copiedPages.forEach(p => mergedPdf.addPage(p));

            } catch (pageError) {
                console.error(`Error processing page ${page.id}:`, pageError);
                // Continue with other pages
            }
        }

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const base64Pdf = Buffer.from(mergedPdfBytes).toString('base64');

        // Return as downloadable file
        return new NextResponse(mergedPdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="merged-document.pdf"`,
                'Content-Length': mergedPdfBytes.length.toString(),
            },
        });

    } catch (error) {
        console.error('PDF merge error:', error);
        return NextResponse.json(
            { error: 'Failed to merge PDFs', details: error.message },
            { status: 500 }
        );
    }
}