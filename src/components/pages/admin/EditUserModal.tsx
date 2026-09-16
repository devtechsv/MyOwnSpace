import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { Select } from '@/components/common/form/Select';
import { User } from '@/contracts/interfaces/user';
import { useEditUserForm } from './useEditUserForm';

interface Props {
  user: User;
  onClose: () => void;
  onUpdated?: () => void;
}

const ROL_OPTIONS = [
  { value: 'Empleado', label: 'Empleado' },
  { value: 'Administrador', label: 'Administrador' },
];

export function EditUserModal({ user, onClose, onUpdated }: Props) {
  const { register, handleSubmit, onSubmit, errors, isSubmitting } =
    useEditUserForm({
      user,
      onSuccess: () => {
        onUpdated?.();
        onClose();
      },
    });

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Editar usuario'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'>
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-base font-bold text-foreground'>Editar usuario</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Cerrar'
            className='text-muted hover:text-foreground'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4' noValidate>
          <TextInput label='Nombre completo' error={errors.nombre?.message} {...register('nombre')} />
          <TextInput label='Correo electrónico' type='email' error={errors.correo?.message} {...register('correo')} />
          <Select label='Rol' options={ROL_OPTIONS} error={errors.rol?.message} {...register('rol')} />

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
              Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}