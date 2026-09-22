import { useState } from 'react';
import { Button } from './Button';
import API from '@/services/api-services';
import { useModalAlly } from '@/hooks/useModalAlly';



interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail?: string;
  isSelf?: boolean;
  onSuccess?: () => void;
}

export function ResetPasswordConfirmModal({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
  isSelf = false,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useModalAlly(isOpen, onClose, isSubmitting);

  if (!isOpen) return null;

  const title = isSelf
    ? '¿Restablecer tu propia contraseña?'
    : `¿Restablecer la contraseña de ${userName}?`;

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await API.users.resetPassword(userId);
      onSuccess?.();
      onClose();
    } catch {
      setError('No pudimos restablecer la contraseña. Intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={title}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div ref={containerRef} className='w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8 text-center'>
        <div className='w-12 h-12 rounded-full bg-turquoise-blue-50 dark:bg-turquoise-blue-950/40 text-turquoise-blue-600 dark:text-turquoise-blue-400 flex items-center justify-center mx-auto mb-4'>
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle cx='8' cy='16' r='3.2' />
            <path d='M10.3 13.7L19 5l2 2M15 6l2 2' />
          </svg>
        </div>

        <h2 className='text-base font-bold text-foreground mb-2'>{title}</h2>
        <p className='text-[13px] text-muted leading-relaxed mb-6'>
          Se enviará un correo con instrucciones a{' '}
          {userEmail ? (
            <strong className='text-foreground'>{userEmail}</strong>
          ) : (
            'tu dirección registrada'
          )}
          . {isSelf ? 'Tu cuenta' : 'La cuenta'} quedará en estado Pendiente
          hasta que {isSelf ? 'accedas' : 'acceda'} con la nueva contraseña.
        </p>

        {error && <p role='alert' className='mb-4 text-xs text-red-500'>{error}</p>}

        <div className='flex gap-2.5'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='flex-1 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
          >
            No
          </button>
          <Button
            type='button'
            onClick={handleConfirm}
            loading={isSubmitting}
            className='flex-1'
          >
            Sí, restablecer
          </Button>
        </div>
      </div>
    </div>
  );
}