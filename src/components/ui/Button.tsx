import React from 'react';

type ButtonVariant = 'primary' | 'outline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  isGoogle?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  fullWidth,
  leftIcon,
  className,
  type = 'button',
  disabled,
  isGoogle,
  children,
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center gap-3 rounded-full border text-[0.95rem] font-semibold tracking-wide ' +
    'px-5 py-3 transition-colors transition-shadow duration-150 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const primary =
    'border-transparent bg-primary text-white shadow-primary ' +
    'hover:bg-primary-hover hover:shadow-primary-hover active:translate-y-px active:shadow-primary-active';

  const outline =
    'bg-white text-gray-800 border-gray-200 shadow-[0_4px_10px_rgba(0,0,0,0.06)] hover:bg-gray-50';

  const google = isGoogle
    ? 'border-[#4285f4]/60 shadow-[0_6px_16px_rgba(66,133,244,0.25)] hover:border-[#4285f4] hover:bg-[#f5f8ff]'
    : '';

  const width = fullWidth ? 'w-full' : '';
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed shadow-none' : '';

  const classes = [base, variant === 'primary' ? primary : outline, google, width, disabledClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled} {...rest}>
      {leftIcon ? <span className="inline-flex items-center justify-center">{leftIcon}</span> : null}
      <span className={variant === 'outline' ? 'font-semibold' : undefined}>{children}</span>
    </button>
  );
};

