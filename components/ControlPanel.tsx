// components/ControlPanel.tsx

import React, { useRef } from 'react';
import { Upload, Download, Trash2, GripVertical } from 'lucide-react';
import { Section } from '@/lib/types';

interface ControlPanelProps {
    sections: Section[];
    isProcessing: boolean;
    editingSectionId: string | null;
    editingSectionName: string;
    draggedSectionIndex: number | null;
    dragOverIndex: number | null;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearAll: () => void;
    onDeleteSection: (sectionId: string) => void;
    onMoveSectionUp: (index: number) => void;
    onMoveSectionDown: (index: number) => void;
    onStartRename: (sectionId: string, currentName: string) => void;
    onSaveRename: () => void;
    onCancelRename: () => void;
    onEditingNameChange: (name: string) => void;
    onScrollToSection: (sectionId: string) => void;
    onSectionDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onSectionDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onSectionDragLeave: () => void;
    onSectionDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    onSectionDragEnd: () => void;
    onShowExportDialog: () => void;
}

export default function ControlPanel({
                                         sections,
                                         isProcessing,
                                         editingSectionId,
                                         editingSectionName,
                                         draggedSectionIndex,
                                         dragOverIndex,
                                         onFileUpload,
                                         onClearAll,
                                         onDeleteSection,
                                         onMoveSectionUp,
                                         onMoveSectionDown,
                                         onStartRename,
                                         onSaveRename,
                                         onCancelRename,
                                         onEditingNameChange,
                                         onScrollToSection,
                                         onSectionDragStart,
                                         onSectionDragOver,
                                         onSectionDragLeave,
                                         onSectionDrop,
                                         onSectionDragEnd,
                                         onShowExportDialog,
                                     }: ControlPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
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
                    onChange={onFileUpload}
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
                        onClick={onClearAll}
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
                                draggable={editingSectionId !== section.id}
                                onDragStart={(e) => onSectionDragStart(e, index)}
                                onDragOver={(e) => onSectionDragOver(e, index)}
                                onDragLeave={onSectionDragLeave}
                                onDrop={(e) => onSectionDrop(e, index)}
                                onDragEnd={onSectionDragEnd}
                                className={`bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-all cursor-pointer
                  ${draggedSectionIndex === index ? 'opacity-50' : ''}
                  ${dragOverIndex === index && draggedSectionIndex !== index ? 'border-blue-500 border-2' : ''}`}
                                onClick={() => onScrollToSection(section.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <div className="mt-1 cursor-grab active:cursor-grabbing">
                                            <GripVertical size={16} className="text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {editingSectionId === section.id ? (
                                                <input
                                                    type="text"
                                                    value={editingSectionName}
                                                    onChange={(e) => onEditingNameChange(e.target.value)}
                                                    onBlur={onSaveRename}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') onSaveRename();
                                                        if (e.key === 'Escape') onCancelRename();
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
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStartRename(section.id, section.name);
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
                                                onDeleteSection(section.id);
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
                                            onMoveSectionUp(index);
                                        }}
                                        disabled={index === 0}
                                        className="flex-1 text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        ↑ Up
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMoveSectionDown(index);
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
                    onClick={onShowExportDialog}
                    disabled={sections.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                    <Download size={18} />
                    Merge & Export
                </button>
            </div>
        </div>
    );
}