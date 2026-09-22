import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { useModalAlly } from '@/hooks/useModalAlly';
import { useRequestPtoForm } from './useRequestPtoForm';

interface Props {
  isOpen: boolean;
  fecha: string;
  onClose: () => void;
  onCreated?: () => void;
}

export function RequestPtoModal({ isOpen, fecha, onClose, onCreated }: Props) {
  const { register, handleSubmit, onSubmit, errors, isSubmitting, serverError, modo } =
    useRequestPtoForm({
      fecha,
      onSuccess: () => {
        onCreated?.();
        onClose();
      },
    });

  const containerRef = useModalAlly(isOpen, onClose, isSubmitting);

  if (!isOpen) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Reservar PTO'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div
        ref={containerRef}
        className='w-full max-w-[400px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'
      >
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-base font-bold text-foreground'>
            Reservar PTO — {fecha}
          </h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Cerrar'
            className='text-muted hover:text-foreground'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {serverError && (
          <div
            role='alert'
            className='mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400'
          >
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-col gap-4'
          noValidate
        >
          <div className='flex flex-col gap-2'>
            <label className='flex items-center gap-2 text-sm text-foreground'>
              <input type='radio' value='completa' {...register('modo')} />
              Jornada completa (8h)
            </label>
            <label className='flex items-center gap-2 text-sm text-foreground'>
              <input type='radio' value='personalizado' {...register('modo')} />
              Tiempo personalizado
            </label>
          </div>

          {modo === 'personalizado' && (
            <TextInput
              label='Horas'
              type='number'
              step='0.5'
              min='0.5'
              max='8'
              error={errors.horasPersonalizadas?.message}
              {...register('horasPersonalizadas')}
            />
          )}

          <div className='flex justify-end gap-2.5 mt-2'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='px-4 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
            >
              Cancelar
            </button>
            <Button type='submit' loading={isSubmitting}>
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
