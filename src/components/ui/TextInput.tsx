import React from 'react';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'password';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  type = 'text',
  leftIcon,
  rightIcon,
  onRightIconClick,
  error,
  id,
  name,
  ...inputProps
}) => {
  const inputId = id ?? name;
  const wrapperClassNames = [
    'flex items-center gap-2 rounded-full border px-4 py-3 bg-[#f7f7fb] border-primary',
    error ? 'border-red-500' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label
          className="text-[0.85rem] font-semibold text-primary lowercase"
          htmlFor={inputId}
        >
          {label}
        </label>
      </div>

      <div className={wrapperClassNames}>
        {leftIcon ? <span className="text-primary">{leftIcon}</span> : null}
        <input
          id={inputId}
          name={name}
          className="flex-1 border-none bg-transparent text-[0.95rem] text-gray-700 outline-none placeholder:text-[#b0b0c0]"
          type={type}
          {...inputProps}
        />
        {rightIcon ? (
          <button
            type="button"
            className="inline-flex items-center justify-center text-[#b0b0c0]"
            onClick={onRightIconClick}
            aria-label="Toggle password visibility"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
};

