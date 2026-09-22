import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { Select } from '@/components/common/form/Select';
import { useCreateUserForm } from './useCreateUserForm';
import { useModalAlly } from '@/hooks/useModalAlly';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const ROL_OPTIONS = [
  { value: 'Empleado', label: 'Empleado' },
  { value: 'Administrador', label: 'Administrador' },
];

export function CreateUserModal({ isOpen, onClose, onCreated }: Props) {
  const { register, handleSubmit, onSubmit, errors, isSubmitting } =
    useCreateUserForm({
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
      aria-label='Crear usuario'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div ref={containerRef} className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'>
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-base font-bold text-foreground'>
            Crear usuario
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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-col gap-4'
          noValidate
        >
          <TextInput
            label='Nombre completo'
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <TextInput
            label='Correo electrónico'
            type='email'
            error={errors.correo?.message}
            {...register('correo')}
          />
          <Select
            label='Rol'
            options={ROL_OPTIONS}
            error={errors.rol?.message}
            {...register('rol')}
          />
          <TextInput
            label='Fecha de ingreso'
            type='date'
            error={errors.fechaIngreso?.message}
            {...register('fechaIngreso')}
          />

          <div className='flex gap-2.5 p-3.5 rounded-xl bg-turquoise-blue-50 dark:bg-turquoise-blue-950/20'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#0993b1'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='shrink-0 mt-0.5'
            >
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='16' x2='12' y2='12' />
              <line x1='12' y1='8' x2='12.01' y2='8' />
            </svg>
            <span className='text-xs leading-relaxed text-foreground'>
              El usuario recibirá una contraseña temporal por correo y
              deberá cambiarla al iniciar sesión por primera vez.
            </span>
          </div>

          <div className='flex justify-end gap-2.5 mt-1'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='px-4 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
            >
              Cancelar
            </button>
            <Button type='submit' loading={isSubmitting}>
              Crear usuario
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
