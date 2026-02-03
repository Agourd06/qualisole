import React from 'react';

export interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  id,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const inputId = id ?? `date-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800 shadow-sm transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50 disabled:text-neutral-500"
      />
    </div>
  );
};
