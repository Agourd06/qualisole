import React from 'react';

export interface IconProps {
  className?: string;
}

export const UserIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M5 19C6.5 16.5 8.9 15 12 15C15.1 15 17.5 16.5 19 19"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

