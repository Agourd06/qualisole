import React from 'react';

interface DividerProps {
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({ label }) => {
  return (
    <div className="flex w-full items-center gap-3 text-xs text-gray-400">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      {label ? <span className="lowercase">{label}</span> : null}
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </div>
  );
};

