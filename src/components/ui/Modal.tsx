import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative bg-gradient-to-b from-tavern-wood to-tavern-bg rounded-xl border-2 border-tavern-gold/50 shadow-gold max-w-md w-full animate-slide-up">
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-tavern-gold/30">
            {title && (
              <h3 className="text-xl font-cinzel text-tavern-gold">{title}</h3>
            )}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-tavern-gold/10 transition-colors"
              >
                <X className="w-5 h-5 text-tavern-cream" />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
