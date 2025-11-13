// lib/hooks.ts

import { useState } from 'react';
import { Page, Section } from './types';

/**
 * Hook for managing drag and drop state for sections
 */
export function useSectionDragDrop() {
    const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedSectionIndex(index);
    };

    const handleDragOver = (index: number) => {
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedSectionIndex(null);
        setDragOverIndex(null);
    };

    return {
        draggedSectionIndex,
        dragOverIndex,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDragEnd,
    };
}

/**
 * Hook for managing drag and drop state for pages
 */
export function usePageDragDrop() {
    const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

    const handleDragStart = (pageId: string) => {
        setDraggedPageId(pageId);
    };

    const handleDragEnd = () => {
        setDraggedPageId(null);
    };

    return {
        draggedPageId,
        handleDragStart,
        handleDragEnd,
    };
}

/**
 * Hook for managing section editing state
 */
export function useSectionEdit() {
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editingSectionName, setEditingSectionName] = useState<string>('');

    const startEdit = (sectionId: string, currentName: string) => {
        setEditingSectionId(sectionId);
        setEditingSectionName(currentName);
    };

    const cancelEdit = () => {
        setEditingSectionId(null);
        setEditingSectionName('');
    };

    return {
        editingSectionId,
        editingSectionName,
        setEditingSectionName,
        startEdit,
        cancelEdit,
    };
}