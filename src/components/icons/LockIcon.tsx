import React from 'react';
import type { IconProps } from './UserIcon';

export const LockIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="9"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M9 10V8C9 5.8 10.4 4 12 4C13.6 4 15 5.8 15 8V10"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

