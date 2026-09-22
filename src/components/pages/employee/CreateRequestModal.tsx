import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { Select } from '@/components/common/form/Select';
import { useCreateRequestForm } from './useCreateRequestForm';
import { useModalAlly } from '@/hooks/useModalAlly';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const TIPO_OPTIONS = [
  { value: 'Emergencia', label: 'Emergencia' },
  { value: 'Enfermedad', label: 'Enfermedad' },
  { value: 'Permiso personal', label: 'Permiso personal' },
  { value: 'Otro', label: 'Otro' },
];

export function CreateRequestModal({ isOpen, onClose, onCreated }: Props) {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    serverError,
  } = useCreateRequestForm({
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
      aria-label='Nueva solicitud'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div ref={containerRef} className='w-full max-w-[440px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'>
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-base font-bold text-foreground'>
            Nueva solicitud
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
          <div role='alert' className='mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400'>
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-col gap-4'
          noValidate
        >
          <Select
            label='Tipo de solicitud'
            options={TIPO_OPTIONS}
            error={errors.tipo?.message}
            {...register('tipo')}
          />

          <div className='flex gap-3'>
            <TextInput
              label='Desde'
              type='date'
              error={errors.fechaInicio?.message}
              {...register('fechaInicio')}
            />
            <TextInput
              label='Hasta'
              type='date'
              error={errors.fechaFin?.message}
              {...register('fechaFin')}
            />
          </div>

          <div className='flex gap-3'>
            <TextInput
              label='Hora desde (opcional)'
              type='time'
              error={errors.horaInicio?.message}
              {...register('horaInicio')}
            />
            <TextInput
              label='Hora hasta (opcional)'
              type='time'
              error={errors.horaFin?.message}
              {...register('horaFin')}
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label
              htmlFor='motivo'
              className='text-xs font-semibold text-muted'
            >
              Motivo
            </label>
            <textarea
              id='motivo'
              rows={3}
              className='w-full px-3.5 py-3 border border-border rounded-[10px] bg-surface-field text-sm text-foreground focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40 resize-none'
              placeholder='Describe brevemente el motivo de tu solicitud...'
              {...register('motivo')}
            />
            {errors.motivo && (
              <span className='text-xs text-red-400'>
                {errors.motivo.message}
              </span>
            )}
          </div>

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
              Enviar solicitud
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
