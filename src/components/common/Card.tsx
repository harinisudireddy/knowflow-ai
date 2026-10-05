import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  ...props
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-4 sm:p-5 lg:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-xl shadow-2xs ${
        hoverable ? 'transition-all duration-200 hover:shadow-md hover:border-slate-300' : ''
      } ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100 mb-4 ${className}`}>
    <div>
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
  </div>
);
