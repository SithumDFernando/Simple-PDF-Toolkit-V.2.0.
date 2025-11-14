// components/PDFToolkit.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Page, Section, PDFExtractResponse } from '@/lib/types';
import { generateThumbnail, downloadBlob } from '@/lib/utils';
import { useSectionDragDrop, usePageDragDrop, useSectionEdit } from '@/lib/hooks';
import ControlPanel from './ControlPanel';
import Workstation from './Workstation';
import ExportDialog from './ExportDialog';

export default function PDFToolkit() {
    const [sections, setSections] = useState<Section[]>([]);
    const [pages, setPages] = useState<Page[]>([]);
    const [showExportDialog, setShowExportDialog] = useState<boolean>(false);
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Custom hooks
    const sectionDrag = useSectionDragDrop();
    const pageDrag = usePageDragDrop();
    const sectionEdit = useSectionEdit();

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

                const response = await fetch('/api/pdf/extract', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to process ${file.name}`);
                }

                const data = await response.json() as PDFExtractResponse;

                setUploadProgress(`Generating thumbnails for ${file.name}...`);
                const pagesWithThumbnails: Page[] = await Promise.all(
                    data.pages.map(async (page) => ({
                        ...page,
                        sectionId: '',
                        thumbnail: await generateThumbnail(page.pdfData)
                    }))
                );

                const newSection: Section = {
                    id: `section-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    pageIds: pagesWithThumbnails.map(p => p.id)
                };

                pagesWithThumbnails.forEach(p => p.sectionId = newSection.id);

                if (insertAfterPageId !== null) {
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
        }
    };

    // Split section at page
    const handleSplit = (pageId: string) => {
        const currentSection = sections.find(s => s.pageIds.includes(pageId));
        if (!currentSection) return;

        const pageIndexInSection = currentSection.pageIds.indexOf(pageId);
        const pagesBeforeSplit = currentSection.pageIds.slice(0, pageIndexInSection + 1);
        const pagesAfterSplit = currentSection.pageIds.slice(pageIndexInSection + 1);

        if (pagesAfterSplit.length === 0) return;

        const updatedCurrentSection: Section = {
            ...currentSection,
            pageIds: pagesBeforeSplit
        };

        const newSection: Section = {
            id: `section-${Date.now()}-${Math.random()}`,
            name: `${currentSection.name} (split)`,
            pageIds: pagesAfterSplit
        };

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

    // Clear all
    const handleClearAll = () => {
        if (sections.length === 0) return;

        if (window.confirm('Are you sure you want to delete all PDFs? This action cannot be undone.')) {
            setSections([]);
            setPages([]);
            sectionRefs.current.clear();
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

    // Rename section
    const saveRenameSection = () => {
        if (sectionEdit.editingSectionId && sectionEdit.editingSectionName.trim()) {
            setSections(prev =>
                prev.map(s =>
                    s.id === sectionEdit.editingSectionId
                        ? { ...s, name: sectionEdit.editingSectionName.trim() }
                        : s
                )
            );
        }
        sectionEdit.cancelEdit();
    };

    // Scroll to section
    const scrollToSection = (sectionId: string) => {
        const element = sectionRefs.current.get(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Section drag and drop
    const handleSectionDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();

        if (sectionDrag.draggedSectionIndex === null || sectionDrag.draggedSectionIndex === dropIndex) {
            sectionDrag.handleDragEnd();
            return;
        }

        const newSections = [...sections];
        const draggedSection = newSections[sectionDrag.draggedSectionIndex];

        newSections.splice(sectionDrag.draggedSectionIndex, 1);
        newSections.splice(dropIndex, 0, draggedSection);

        setSections(newSections);
        reorderPagesFromSections(newSections);

        sectionDrag.handleDragEnd();
    };

    // Page drag and drop
    const handlePageDrop = (e: React.DragEvent<HTMLDivElement>, dropPageId: string) => {
        e.preventDefault();

        if (!pageDrag.draggedPageId || pageDrag.draggedPageId === dropPageId) {
            pageDrag.handleDragEnd();
            return;
        }

        const draggedIndex = pages.findIndex(p => p.id === pageDrag.draggedPageId);
        const dropIndex = pages.findIndex(p => p.id === dropPageId);

        if (draggedIndex === -1 || dropIndex === -1) {
            pageDrag.handleDragEnd();
            return;
        }

        const newPages = [...pages];
        const draggedPage = newPages[draggedIndex];

        newPages.splice(draggedIndex, 1);
        newPages.splice(dropIndex, 0, draggedPage);

        setPages(newPages);
        rebuildSectionsFromPages(newPages);

        pageDrag.handleDragEnd();
    };

    const rebuildSectionsFromPages = (reorderedPages: Page[]) => {
        const newSections: Section[] = [];
        const sectionMap = new Map<string, string[]>();

        reorderedPages.forEach(page => {
            if (!sectionMap.has(page.sectionId)) {
                sectionMap.set(page.sectionId, []);
            }
            sectionMap.get(page.sectionId)?.push(page.id);
        });

        const seenSections = new Set<string>();
        reorderedPages.forEach(page => {
            if (!seenSections.has(page.sectionId)) {
                seenSections.add(page.sectionId);
                const section = sections.find(s => s.id === page.sectionId);
                if (section) {
                    newSections.push({
                        ...section,
                        pageIds: sectionMap.get(page.sectionId) || []
                    });
                }
            }
        });

        setSections(newSections);
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
            const pagesToExport: Page[] = [];

            selectedSections.forEach(sectionId => {
                const section = sections.find(s => s.id === sectionId);
                if (section) {
                    const sectionPages = pages.filter(p => section.pageIds.includes(p.id));
                    pagesToExport.push(...sectionPages);
                }
            });

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

            const blob = await response.blob();
            downloadBlob(blob, `merged-document-${Date.now()}.pdf`);

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

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Loading Overlay */}
            {isProcessing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-xl">
                        <Loader2 className="animate-spin text-[#00BFA6]" size={40} />
                        <p className="text-gray-700 font-semibold">{uploadProgress}</p>
                    </div>
                </div>
            )}

            <ControlPanel
                sections={sections}
                isProcessing={isProcessing}
                editingSectionId={sectionEdit.editingSectionId}
                editingSectionName={sectionEdit.editingSectionName}
                draggedSectionIndex={sectionDrag.draggedSectionIndex}
                dragOverIndex={sectionDrag.dragOverIndex}
                onFileUpload={handleFileUpload}
                onClearAll={handleClearAll}
                onDeleteSection={handleDeleteSection}
                onMoveSectionUp={moveSectionUp}
                onMoveSectionDown={moveSectionDown}
                onStartRename={sectionEdit.startEdit}
                onSaveRename={saveRenameSection}
                onCancelRename={sectionEdit.cancelEdit}
                onEditingNameChange={sectionEdit.setEditingSectionName}
                onScrollToSection={scrollToSection}
                onSectionDragStart={(e, index) => {
                    e.dataTransfer.effectAllowed = 'move';
                    sectionDrag.handleDragStart(index);
                }}
                onSectionDragOver={(e, index) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    sectionDrag.handleDragOver(index);
                }}
                onSectionDragLeave={sectionDrag.handleDragLeave}
                onSectionDrop={handleSectionDrop}
                onSectionDragEnd={sectionDrag.handleDragEnd}
                onShowExportDialog={() => setShowExportDialog(true)}
            />

            <Workstation
                pages={pages}
                sections={sections}
                draggedPageId={pageDrag.draggedPageId}
                sectionRefs={sectionRefs}
                onSplit={handleSplit}
                onAddPages={handleFileUpload}
                onPageDragStart={(e, pageId) => {
                    e.dataTransfer.effectAllowed = 'move';
                    pageDrag.handleDragStart(pageId);
                }}
                onPageDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onPageDrop={handlePageDrop}
                onPageDragEnd={pageDrag.handleDragEnd}
            />

            {showExportDialog && (
                <ExportDialog
                    sections={sections}
                    pages={pages}
                    selectedSections={selectedSections}
                    isProcessing={isProcessing}
                    onToggleSection={toggleSectionSelection}
                    onExport={handleExport}
                    onClose={() => {
                        setShowExportDialog(false);
                        setSelectedSections([]);
                    }}
                />
            )}
        </div>
    );
}