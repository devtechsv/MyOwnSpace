import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { evaluatePasswordRules, isPasswordValid } from '@/lib/password-rules';
import { cx } from '@/helpers/cx';
import { Button } from './Button';
import { TextInput } from './form/TextInput';
import API from '@/services/api-services';
import { useModalAlly } from '@/hooks/useModalAlly';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Cuando viene de una contraseña temporal: sin botón "Cancelar" y sin
  // poder cerrar con Escape — tiene que completar el cambio para seguir.
  forced?: boolean;
}

interface Inputs {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}

export function ChangePasswordModal({ isOpen, onClose, forced = false }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, reset } = useForm<Inputs>({
    defaultValues: { passwordActual: '', passwordNueva: '', confirmarPassword: '' },
  });

  const passwordActual = watch('passwordActual');
  const passwordNueva = watch('passwordNueva');
  const confirmarPassword = watch('confirmarPassword');

  const handleClose = () => {
    reset();
    setServerError(null);
    onClose();
  };

  const containerRef = useModalAlly(isOpen, handleClose, forced || isSubmitting);

  if (!isOpen) return null;

  const requirements = evaluatePasswordRules(passwordNueva, { passwordActual });
  const passwordsMatch = confirmarPassword.length > 0 && passwordNueva === confirmarPassword;
  const canSubmit =
    passwordActual.length > 0 && isPasswordValid(passwordNueva, { passwordActual }) && passwordsMatch;

  const onSubmit = handleSubmit(async (data) => {
    if (!canSubmit) return;

    setServerError(null);
    setIsSubmitting(true);
    try {
      await API.auth.changePassword({
        passwordActual: data.passwordActual,
        passwordNueva: data.passwordNueva,
      });
      handleClose();
    } catch {
      setServerError('No pudimos cambiar tu contraseña. Revise su contraseña actual e intente de nuevo.');
      setIsSubmitting(false);
    }
  });

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Cambiar tu contraseña'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div ref={containerRef} className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'>
        <h2 className='text-base font-bold text-foreground mb-2 text-center'>
          Cambiar tu contraseña
        </h2>

        {forced && (
          <p className='text-sm text-muted mb-4 text-center'>
            Entraste con una contraseña temporal — elegí una propia para
            seguir usando MyOwnSpace.
          </p>
        )}

        {serverError && (
          <div role='alert' className='mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400'>
            {serverError}
          </div>
        )}

        <form onSubmit={onSubmit} className='flex flex-col gap-4' noValidate>
          <TextInput
            label='Contraseña actual'
            type='password'
            autoComplete='current-password'
            {...register('passwordActual')}
          />

          <TextInput
            label='Nueva contraseña'
            type='password'
            autoComplete='new-password'
            {...register('passwordNueva')}
          />

          <TextInput
            label='Confirmar nueva contraseña'
            type='password'
            autoComplete='new-password'
            error={
              confirmarPassword.length > 0 && !passwordsMatch
                ? 'Las contraseñas no coinciden'
                : undefined
            }
            {...register('confirmarPassword')}
          />

          <div className='flex flex-col gap-2 p-3.5 rounded-xl bg-surface-field'>
            <span className='text-[11px] font-semibold text-muted uppercase tracking-wide mb-0.5'>
              Tu nueva contraseña debe tener
            </span>
            {requirements.map((req) => (
              <span
                key={req.id}
                className={cx('text-[13px]', req.met ? 'text-foreground' : 'text-muted')}
              >
                {req.met ? '✓' : '○'} {req.label}
              </span>
            ))}
          </div>

          <div className='flex gap-2.5 mt-1'>
            {!forced && (
              <button
                type='button'
                onClick={handleClose}
                disabled={isSubmitting}
                className='flex-1 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
              >
                Cancelar
              </button>
            )}
            <Button type='submit' loading={isSubmitting} disabled={!canSubmit || isSubmitting} className='flex-1'>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}