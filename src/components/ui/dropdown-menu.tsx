'use client';
import React, { createContext, useContext, useState } from 'react';

type DropdownContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownContext.Provider>
  );
};

export const DropdownMenuTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({
  children,
}) => {
  const ctx = useContext(DropdownContext);
  return (
    <div onClick={() => ctx?.setOpen(!ctx.open)}>
      {children}
    </div>
  );
};

export const DropdownMenuContent: React.FC<{ align?: string; children: React.ReactNode }> = ({
  children,
}) => {
  const ctx = useContext(DropdownContext);
  if (!ctx?.open) return null;
  return (
    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
      {children}
    </div>
  );
};

export const DropdownMenuItem: React.FC<{
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className = '', children }) => {
  const ctx = useContext(DropdownContext);
  return (
    <div
      onClick={() => {
        onClick?.();
        ctx?.setOpen(false);
      }}
      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${className}`}
    >
      {children}
    </div>
  );
};
