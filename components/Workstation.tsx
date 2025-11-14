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
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                    Workstation ({pages.length} pages)
                </h2>

                {pages.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Upload size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No pages yet. Upload PDFs to start organizing.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {sections.map((section) => {
                            const sectionPages = pages.filter(p => p.sectionId === section.id);
                            if (sectionPages.length === 0) return null;

                            return (
                                <div key={section.id} className="bg-white rounded-lg shadow-sm p-6">
                                    {/* Section Header */}
                                    <div
                                        ref={(el) => {
                                            if (el) sectionRefs.current.set(section.id, el);
                                        }}
                                        className="mb-4 pb-3 border-b-2 border-blue-500 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">📁</span>
                                            <h3 className="text-base font-semibold text-blue-700">
                                                {section.name}
                                            </h3>
                                            <span className="text-sm text-gray-500">
                        ({sectionPages.length} {sectionPages.length === 1 ? 'page' : 'pages'})
                      </span>
                                        </div>
                                    </div>

                                    {/* Pages Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                        {sectionPages.map((page, index) => {
                                            const isLastInSection = index === sectionPages.length - 1;

                                            return (
                                                <div
                                                    key={page.id}
                                                    draggable
                                                    onDragStart={(e) => onPageDragStart(e, page.id)}
                                                    onDragOver={onPageDragOver}
                                                    onDrop={(e) => onPageDrop(e, page.id)}
                                                    onDragEnd={onPageDragEnd}
                                                    className={`group relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden transition-all cursor-move hover:shadow-lg hover:border-blue-400
                            ${draggedPageId === page.id ? 'opacity-40 scale-95' : ''}`}
                                                >
                                                    {/* Drag Handle */}
                                                    <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded p-1">
                                                        <GripVertical size={16} className="text-gray-600" />
                                                    </div>

                                                    {/* Page Number Badge */}
                                                    <div className="absolute top-1 right-1 z-10 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                                        {page.pageNumber}
                                                    </div>

                                                    {/* Thumbnail */}
                                                    <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center overflow-hidden">
                                                        {page.thumbnail ? (
                                                            <img
                                                                src={page.thumbnail}
                                                                alt={`Page ${page.pageNumber}`}
                                                                className="w-full h-full object-contain pointer-events-none"
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-gray-400 p-4">
                                                                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <span className="text-xs">Page {page.pageNumber}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Page Info */}
                                                    <div className="p-2 bg-gray-50 border-t border-gray-200">
                                                        <p className="text-xs text-gray-600 truncate" title={page.fileName}>
                                                            {page.fileName}
                                                        </p>
                                                    </div>

                                                    {/* Action Buttons - Show on Hover */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSplit(page.id);
                                                            }}
                                                            disabled={isLastInSection}
                                                            className="w-full text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 rounded flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            title="Split section after this page"
                                                        >
                                                            <Scissors size={12} />
                                                            Split Here
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.accept = '.pdf';
                                                                input.multiple = true;
                                                                input.onchange = (event) => onAddPages(event as unknown as React.ChangeEvent<HTMLInputElement>, page.id);
                                                                input.click();
                                                            }}
                                                            className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                                            title="Add pages after this page"
                                                        >
                                                            <Plus size={12} />
                                                            Add Pages
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}