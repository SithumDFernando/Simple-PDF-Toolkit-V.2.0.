// components/Workstation.tsx

import React from 'react';
import { Upload, Plus, Scissors, GripVertical } from 'lucide-react';
import { Page, Section } from '@/lib/types';

interface WorkstationProps {
    pages: Page[];
    sections: Section[];
    draggedPageId: string | null;
    sectionRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    onSplit: (pageId: string) => void;
    onAddPages: (e: React.ChangeEvent<HTMLInputElement>, insertAfterPageId: string) => void;
    onPageDragStart: (e: React.DragEvent<HTMLDivElement>, pageId: string) => void;
    onPageDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onPageDrop: (e: React.DragEvent<HTMLDivElement>, dropPageId: string) => void;
    onPageDragEnd: () => void;
}

export default function Workstation({
                                        pages,
                                        sections,
                                        draggedPageId,
                                        sectionRefs,
                                        onSplit,
                                        onAddPages,
                                        onPageDragStart,
                                        onPageDragOver,
                                        onPageDrop,
                                        onPageDragEnd,
                                    }: WorkstationProps) {
    return (
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
                                    <div
                                        draggable
                                        onDragStart={(e) => onPageDragStart(e, page.id)}
                                        onDragOver={onPageDragOver}
                                        onDrop={(e) => onPageDrop(e, page.id)}
                                        onDragEnd={onPageDragEnd}
                                        className={`bg-white border-2 border-gray-300 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move
                      ${draggedPageId === page.id ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="cursor-grab active:cursor-grabbing">
                                                <GripVertical size={20} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-800">
                                                    {page.fileName} - Page {page.pageNumber}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Section: {sections.find(s => s.id === page.sectionId)?.name}
                                                </div>
                                            </div>

                                            {/* Page thumbnail */}
                                            <div className="w-20 h-24 bg-gray-100 border border-gray-300 rounded flex items-center justify-center overflow-hidden pointer-events-none">
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
                                                onClick={() => onSplit(page.id)}
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
                                                    input.onchange = (e) => onAddPages(e as unknown as React.ChangeEvent<HTMLInputElement>, page.id);
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
    );
}