'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Plus, Trash2, Scissors, Loader2 } from 'lucide-react';

// Type definitions
interface Page {
    id: string;
    pageNumber: number;
    fileName: string;
    sectionId: string;
    pdfData: string;
    thumbnail: string | null;
}

interface Section {
    id: string;
    name: string;
    pageIds: string[];
}

interface SectionWithRef extends Section {
    ref?: HTMLDivElement | null;
}

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

export default function PDFToolkit() {
    const [sections, setSections] = useState<Section[]>([]);
    const [pages, setPages] = useState<Page[]>([]);
    const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionName, setEditingSectionName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Generate thumbnail from PDF data
    const generateThumbnail = async (pdfData: string): Promise<string | null> => {
        if (!pdfjsLib) return null;

        try {
            const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData) });
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
    };

    // Handle PDF upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, insertAfterPageId: string | null = null) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);

        setIsProcessing(true);
        setUploadProgress('Uploading PDFs...');

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress(`Processing ${file.name} (${i + 1}/${files.length})...`);

                const formData = new FormData();
                formData.append('pdf', file);

                // Call API to extract pages
                const response = await fetch('/api/pdf/extract', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to process ${file.name}`);
                }

                const data = await response.json() as {
                    pages: Array<{
                        id: string;
                        pageNumber: number;
                        fileName: string;
                        pdfData: string;
                        thumbnail: null;
                    }>;
                };

                // Generate thumbnails for pages
                setUploadProgress(`Generating thumbnails for ${file.name}...`);
                const pagesWithThumbnails: Page[] = await Promise.all(
                    data.pages.map(async (page) => ({
                        ...page,
                        sectionId: '',
                        thumbnail: await generateThumbnail(page.pdfData)
                    }))
                );

                // Create a new section for this PDF
                const newSection: Section = {
                    id: `section-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    pageIds: pagesWithThumbnails.map(p => p.id)
                };

                // Assign section ID to pages
                pagesWithThumbnails.forEach(p => p.sectionId = newSection.id);

                if (insertAfterPageId !== null) {
                    // Insert at specific position
                    const insertPageIndex = pages.findIndex(p => p.id === insertAfterPageId);
                    setPages(prev => [
                        ...prev.slice(0, insertPageIndex + 1),
                        ...pagesWithThumbnails,
                        ...prev.slice(insertPageIndex + 1)
                    ]);

                    const currentSection = sections.find(s =>
                        s.pageIds.includes(insertAfterPageId)
                    );
                    const insertSectionIndex = currentSection ? sections.indexOf(currentSection) : sections.length;
                    setSections(prev => [
                        ...prev.slice(0, insertSectionIndex + 1),
                        newSection,
                        ...prev.slice(insertSectionIndex + 1)
                    ]);
                } else {
                    // Add to end
                    setPages(prev => [...prev, ...pagesWithThumbnails]);
                    setSections(prev => [...prev, newSection]);
                }
            }
        } catch (error: unknown) {
            console.error('Error uploading PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Error: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
            setUploadProgress('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Split section at page
    const handleSplit = (pageId: string) => {
        const pageIndex = pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;

        const currentSection = sections.find(s => s.pageIds.includes(pageId));
        if (!currentSection) return;

        const pageIndexInSection = currentSection.pageIds.indexOf(pageId);

        // Split the section's pages
        const pagesBeforeSplit = currentSection.pageIds.slice(0, pageIndexInSection + 1);
        const pagesAfterSplit = currentSection.pageIds.slice(pageIndexInSection + 1);

        if (pagesAfterSplit.length === 0) return;

        // Update current section
        const updatedCurrentSection: Section = {
            ...currentSection,
            pageIds: pagesBeforeSplit
        };

        // Create new section
        const newSection: Section = {
            id: `section-${Date.now()}-${Math.random()}`,
            name: `${currentSection.name} (split)`,
            pageIds: pagesAfterSplit
        };

        // Update section IDs in pages
        const updatedPages = pages.map(p => {
            if (pagesAfterSplit.includes(p.id)) {
                return { ...p, sectionId: newSection.id };
            }
            return p;
        });

        setPages(updatedPages);

        const sectionIndex = sections.findIndex(s => s.id === currentSection.id);
        setSections(prev => [
            ...prev.slice(0, sectionIndex),
            updatedCurrentSection,
            newSection,
            ...prev.slice(sectionIndex + 1)
        ]);
    };

    // Delete section
    const handleDeleteSection = (sectionId: string) => {
        setSections(prev => prev.filter(s => s.id !== sectionId));
        setPages(prev => prev.filter(p => p.sectionId !== sectionId));
        sectionRefs.current.delete(sectionId);
    };

    // Delete all sections and pages
    const handleClearAll = () => {
        if (sections.length === 0) return;

        if (window.confirm('Are you sure you want to delete all PDFs? This action cannot be undone.')) {
            setSections([]);
            setPages([]);
            sectionRefs.current.clear();
        }
    };

    // Rename section
    const startRenameSection = (sectionId: string, currentName: string) => {
        setEditingSectionId(sectionId);
        setEditingSectionName(currentName);
    };

    const saveRenameSection = () => {
        if (editingSectionId && editingSectionName.trim()) {
            setSections(prev =>
                prev.map(s =>
                    s.id === editingSectionId
                        ? { ...s, name: editingSectionName.trim() }
                        : s
                )
            );
        }
        setEditingSectionId(null);
        setEditingSectionName('');
    };

    const cancelRenameSection = () => {
        setEditingSectionId(null);
        setEditingSectionName('');
    };

    // Scroll to section in workstation
    const scrollToSection = (sectionId: string) => {
        const element = sectionRefs.current.get(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Reorder sections
    const moveSectionUp = (index: number) => {
        if (index === 0) return;
        const newSections = [...sections];
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
        setSections(newSections);
        reorderPagesFromSections(newSections);
    };

    const moveSectionDown = (index: number) => {
        if (index === sections.length - 1) return;
        const newSections = [...sections];
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        setSections(newSections);
        reorderPagesFromSections(newSections);
    };

    const reorderPagesFromSections = (orderedSections: Section[]) => {
        const newPagesOrder: Page[] = [];
        orderedSections.forEach(section => {
            const sectionPages = pages.filter(p => section.pageIds.includes(p.id));
            newPagesOrder.push(...sectionPages);
        });
        setPages(newPagesOrder);
    };

    // Toggle section selection for export
    const toggleSectionSelection = (sectionId: string) => {
        setSelectedSections(prev => {
            if (prev.includes(sectionId)) {
                return prev.filter(id => id !== sectionId);
            } else {
                return [...prev, sectionId];
            }
        });
    };

    // Export selected sections
    const handleExport = async () => {
        if (selectedSections.length === 0) return;

        setIsProcessing(true);
        setUploadProgress('Merging PDFs...');

        try {
            // Get pages in the order user selected sections (not original order)
            const pagesToExport: Page[] = [];

            // Iterate through selectedSections array to maintain user's selection order
            selectedSections.forEach(sectionId => {
                const section = sections.find(s => s.id === sectionId);
                if (section) {
                    const sectionPages = pages.filter(p => section.pageIds.includes(p.id));
                    pagesToExport.push(...sectionPages);
                }
            });

            // Send to merge API
            const response = await fetch('/api/pdf/merge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pages: pagesToExport })
            });

            if (!response.ok) {
                throw new Error('Failed to merge PDFs');
            }

            // Download the merged PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `merged-document-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowExportDialog(false);
            setSelectedSections([]);
        } catch (error: unknown) {
            console.error('Error exporting PDF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Export failed: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
            setUploadProgress('');
        }
    };

    // Get preview pages for export dialog
    const getPreviewPages = (): Page[] => {
        const previewPages: Page[] = [];

        // Iterate through selectedSections array to maintain user's selection order
        selectedSections.forEach(sectionId => {
            const section = sections.find(s => s.id === sectionId);
            if (section) {
                const sectionPages = pages.filter(p => section.pageIds.includes(p.id));
                previewPages.push(...sectionPages);
            }
        });

        return previewPages;
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Loading Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                        <p className="text-gray-700 font-medium">{uploadProgress}</p>
                    </div>
                </div>
            )}

            {/* Left Panel - Control Panel */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-800">PDF Toolkit</h1>
                    <p className="text-sm text-gray-500 mt-1">Organize and merge PDFs</p>
                </div>

                {/* Upload Button */}
                <div className="p-4 border-b border-gray-200">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={(e) => handleFileUpload(e)}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        <Upload size={18} />
                        Upload PDF(s)
                    </button>

                    {sections.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            disabled={isProcessing}
                            className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors border border-red-200"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    )}
                </div>

                {/* Sections List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                        Sections ({sections.length})
                    </h2>

                    {sections.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Upload PDFs to get started
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer"
                                    onClick={() => scrollToSection(section.id)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {editingSectionId === section.id ? (
                                                <input
                                                    type="text"
                                                    value={editingSectionName}
                                                    onChange={(e) => setEditingSectionName(e.target.value)}
                                                    onBlur={saveRenameSection}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveRenameSection();
                                                        if (e.key === 'Escape') cancelRenameSection();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full text-sm font-medium text-gray-800 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="text-sm font-medium text-gray-800 truncate">
                                                    {section.name}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {section.pageIds.length} page(s)
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startRenameSection(section.id, section.name);
                                                }}
                                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                                title="Rename section"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSection(section.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                                title="Delete section"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 mt-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveSectionUp(index);
                                            }}
                                            disabled={index === 0}
                                            className="flex-1 text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ↑ Up
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                moveSectionDown(index);
                                            }}
                                            disabled={index === sections.length - 1}
                                            className="flex-1 text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            ↓ Down
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Export Button */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={() => setShowExportDialog(true)}
                        disabled={sections.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        <Download size={18} />
                        Merge & Export
                    </button>
                </div>
            </div>

            {/* Right Panel - Workstation */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Workstation ({pages.length} pages)
                    </h2>

                    {pages.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Upload size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No pages yet. Upload PDFs to start organizing.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pages.map((page, index) => {
                                const isLastInSection = !pages[index + 1] ||
                                    pages[index + 1].sectionId !== page.sectionId;
                                const isFirstInSection = index === 0 ||
                                    pages[index - 1].sectionId !== page.sectionId;

                                return (
                                    <div key={page.id}>
                                        {/* Section Header (shown at first page of section) */}
                                        {isFirstInSection && (
                                            <div
                                                ref={(el) => {
                                                    if (el) sectionRefs.current.set(page.sectionId, el);
                                                }}
                                                className="mb-3 pb-2 border-b-2 border-blue-500"
                                            >
                                                <div className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded">
                                                    📁 {sections.find(s => s.id === page.sectionId)?.name}
                                                </div>
                                            </div>
                                        )}

                                        {/* Page Card */}
                                        <div className="bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-800">
                                                        {page.fileName} - Page {page.pageNumber}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Section: {sections.find(s => s.id === page.sectionId)?.name}
                                                    </div>
                                                </div>

                                                {/* Page thumbnail */}
                                                <div className="w-20 h-24 bg-gray-100 border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                                                    {page.thumbnail ? (
                                                        <img
                                                            src={page.thumbnail}
                                                            alt={`Page ${page.pageNumber}`}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <div className="text-xs text-gray-400 text-center p-2">
                                                            Page {page.pageNumber}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => handleSplit(page.id)}
                                                    disabled={isLastInSection}
                                                    className="flex-1 text-sm bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded hover:bg-orange-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Scissors size={14} />
                                                    Split Here
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = '.pdf';
                                                        input.multiple = true;
                                                        input.onchange = (e) => handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>, page.id);
                                                        input.click();
                                                    }}
                                                    className="flex-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Plus size={14} />
                                                    Add Pages
                                                </button>
                                            </div>
                                        </div>

                                        {/* Section Divider */}
                                        {isLastInSection && index < pages.length - 1 && (
                                            <div className="flex items-center gap-2 my-6">
                                                <div className="flex-1 h-px bg-blue-400"></div>
                                                <span className="text-xs text-blue-600 font-medium px-2">
                          End of "{sections.find(s => s.id === page.sectionId)?.name}"
                        </span>
                                                <div className="flex-1 h-px bg-blue-400"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Export Dialog */}
            {showExportDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">Merge & Export PDF</h2>
                            <p className="text-sm text-gray-500 mt-1">Select sections to include in the final PDF</p>
                        </div>

                        <div className="flex-1 overflow-hidden flex">
                            {/* Section Selection */}
                            <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Sections</h3>
                                <div className="space-y-2">
                                    {sections.map((section) => {
                                        const isSelected = selectedSections.includes(section.id);
                                        const selectionOrder = selectedSections.indexOf(section.id) + 1;

                                        return (
                                            <label
                                                key={section.id}
                                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="relative">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSectionSelection(section.id)}
                                                        className="w-5 h-5 cursor-pointer"
                                                    />
                                                    {isSelected && (
                                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full font-bold">
                              {selectionOrder}
                            </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-800 truncate">
                                                        {section.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {section.pageIds.length} page(s)
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    Preview ({getPreviewPages().length} pages)
                                </h3>

                                {selectedSections.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 text-sm">
                                        Select sections to preview
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {getPreviewPages().map((page, index) => (
                                            <div
                                                key={page.id}
                                                className="bg-white border border-gray-200 rounded p-2 text-xs flex items-center gap-2"
                                            >
                                                {page.thumbnail && (
                                                    <img
                                                        src={page.thumbnail}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-8 h-10 object-contain border border-gray-200 rounded"
                                                    />
                                                )}
                                                <div className="flex-1">
                          <span className="font-medium text-gray-700">
                            Page {index + 1}:
                          </span>{' '}
                                                    <span className="text-gray-600">
                            {page.fileName} (p{page.pageNumber})
                          </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowExportDialog(false);
                                    setSelectedSections([]);
                                }}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={selectedSections.length === 0 || isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <Download size={18} />
                                Export & Download ({selectedSections.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}