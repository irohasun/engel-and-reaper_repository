import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'wood' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'gold',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'font-cinzel font-medium rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    gold: 'bg-gradient-to-b from-tavern-gold to-tavern-leather text-tavern-bg border-2 border-tavern-gold-light shadow-gold hover:shadow-lg hover:from-tavern-gold-light hover:to-tavern-gold',
    wood: 'bg-gradient-to-b from-tavern-wood-light to-tavern-wood text-tavern-cream border-2 border-tavern-leather shadow-card hover:shadow-card-hover hover:border-tavern-gold',
    ghost: 'bg-transparent text-tavern-cream border border-tavern-gold/30 hover:bg-tavern-gold/10 hover:border-tavern-gold',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
