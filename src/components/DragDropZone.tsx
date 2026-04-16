"use client";

import { useRef, useState, type ReactNode } from "react";

interface DragDropZoneProps {
  onFiles: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  children?: ReactNode;
}

export default function DragDropZone({
  onFiles,
  accept,
  multiple = false,
  children,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        isDragging
          ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
          : "border-zinc-300 dark:border-zinc-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10"
      }`}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50/80 dark:bg-amber-900/30 rounded-lg z-10">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Drop files here</p>
        </div>
      )}
      {children}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}