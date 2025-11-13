// components/ExportDialog.tsx

import React from 'react';
import { Download } from 'lucide-react';
import { Page, Section } from '@/lib/types';

interface ExportDialogProps {
    sections: Section[];
    pages: Page[];
    selectedSections: string[];
    isProcessing: boolean;
    onToggleSection: (sectionId: string) => void;
    onExport: () => void;
    onClose: () => void;
}

export default function ExportDialog({
                                         sections,
                                         pages,
                                         selectedSections,
                                         isProcessing,
                                         onToggleSection,
                                         onExport,
                                         onClose,
                                     }: ExportDialogProps) {
    // Get preview pages in user's selection order
    const getPreviewPages = (): Page[] => {
        const previewPages: Page[] = [];

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
                                                onChange={() => onToggleSection(section.id)}
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
                        onClick={onClose}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onExport}
                        disabled={selectedSections.length === 0 || isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                        <Download size={18} />
                        Export & Download ({selectedSections.length})
                    </button>
                </div>
            </div>
        </div>
    );
}