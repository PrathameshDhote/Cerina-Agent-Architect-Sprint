import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colors = {
    primary: 'bg-cerina-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
  };

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">
            {label || `Progress: ${Math.round(percentage)}%`}
          </span>
          <span className="text-sm text-gray-500">
            {value} / {max}
          </span>
        </div>
      )}
      
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full transition-all duration-300 ease-in-out rounded-full', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
