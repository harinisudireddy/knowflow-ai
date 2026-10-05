import React from 'react';

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  // Compute initials (up to 2 letters)
  const initials = React.useMemo(() => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-semibold',
  };

  // Color generator based on name hash for consistent pleasing tint
  const bgHue = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hues = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-violet-600 text-white',
      'bg-emerald-600 text-white',
      'bg-teal-600 text-white',
      'bg-slate-700 text-white',
    ];
    return hues[Math.abs(hash) % hues.length];
  }, [name]);

  if (avatarUrl && !imageError && !avatarUrl.includes('unsplash.com')) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImageError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-slate-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold select-none shrink-0 ${bgHue} ${className}`}
      aria-label={name}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
};
