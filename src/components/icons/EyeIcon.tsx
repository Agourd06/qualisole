import React from 'react';
import type { IconProps } from './UserIcon';

export const EyeIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 12C3.6 8.7 7.2 6 12 6C16.8 6 20.4 8.7 21.5 12C20.4 15.3 16.8 18 12 18C7.2 18 3.6 15.3 2.5 12Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.5 4.5L19.5 19.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M6 7.2C7.4 6.4 9.1 6 11 6C16 6 19.7 8.8 20.9 12.1C20.5 13.4 19.8 14.6 18.9 15.7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 8.5C9.4 7.8 10.5 7.4 11.8 7.5C13.9 7.7 15.6 9.4 15.8 11.5C15.9 12.8 15.5 13.9 14.8 14.8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.7 9.3C4.5 10.2 3.6 11.4 3.1 12.9C4.3 16.2 8 18.9 13 18.9C13.9 18.9 14.7 18.8 15.4 18.7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

