import React from 'react';

export interface NavDateInputProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  'aria-label': string;
  disabled?: boolean;
}

/**
 * Compact date input for navbar (no visible label, single line).
 */
export const NavDateInput: React.FC<NavDateInputProps> = ({
  value,
  onChange,
  id,
  'aria-label': ariaLabel,
  disabled = false,
}) => (
  <input
    id={id}
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    aria-label={ariaLabel}
    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-[0.85rem] font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
  />
);
