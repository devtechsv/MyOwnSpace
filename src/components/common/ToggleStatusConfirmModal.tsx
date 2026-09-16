import { useState } from 'react';
import { Button } from './Button';
import API from '@/services/api-services';
import { User } from '@/contracts/interfaces/user';

interface Props {
  user: User;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ToggleStatusConfirmModal({ user, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActivating = user.estado === 'Desactivado';
  const title = isActivating ? `¿Activar a ${user.nombre}?` : `¿Desactivar a ${user.nombre}?`;
  const description = isActivating
    ? 'Recuperará acceso al sistema con su contraseña actual.'
    : 'Perderá acceso al sistema hasta que un administrador lo reactive.';

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await API.users.toggleStatus(user.id);
      onSuccess?.();
      onClose();
    } catch {
      setError('No pudimos actualizar el estado. Intentá de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div role='dialog' aria-modal='true' aria-label={title} className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
      <div className='w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8 text-center'>
        <h2 className='text-base font-bold text-foreground mb-2'>{title}</h2>
        <p className='text-[13px] text-muted leading-relaxed mb-6'>{description}</p>

        {error && <p className='mb-4 text-xs text-red-500'>{error}</p>}

        <div className='flex gap-2.5'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='flex-1 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
          >
            Cancelar
          </button>
          <Button type='button' onClick={handleConfirm} loading={isSubmitting} className='flex-1'>
            {isActivating ? 'Sí, activar' : 'Sí, desactivar'}
          </Button>
        </div>
      </div>
    </div>
  );
}