import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colorStyles = {
    primary: 'text-cerina-600',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  return (
    <svg
      className={cn('animate-spin', sizeStyles[size], colorStyles[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

// Full Page Loader
export const PageLoader: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Spinner size="xl" />
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
};
