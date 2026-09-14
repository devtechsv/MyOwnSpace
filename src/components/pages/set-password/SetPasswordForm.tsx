import Image from 'next/image';
import { evaluatePasswordRules } from '@/lib/password-rules';
import { cx } from '@/helpers/cx';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import useSetPasswordForm from './useSetPasswordForm';

const SetPasswordForm = () => {
  const {
    register,
    handleSubmit,
    onSubmit,
    password,
    confirmPassword,
    passwordsMatch,
    canSubmit,
    isSubmitting,
    serverError,
  } = useSetPasswordForm();

  const requirements = evaluatePasswordRules(password);
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <section className='min-h-screen relative bg-background px-5 py-10 grid place-content-center'>
      <ThemeToggle className='absolute top-6 right-6' />

      <div className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-9 py-10'>
        <Image
          src='/logo.png'
          alt='Logo DevTech'
          width={56}
          height={56}
          className='mx-auto mb-4'
        />

        <h1 className='text-center text-xl font-bold text-foreground'>
          Definí tu nueva contraseña
        </h1>
        <p className='text-center text-sm text-muted mt-1.5 mb-6 leading-relaxed'>
          Tu contraseña temporal ya cumplió su función. Elegí una nueva
          para continuar — aplica igual para empleados y administradores.
        </p>

        {serverError && (
          <div className='mb-5 rounded-[10px] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400'>
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='flex flex-col gap-4'
          noValidate
        >
          <TextInput
            label='Nueva contraseña'
            type='password'
            autoComplete='new-password'
            {...register('password')}
          />

          <TextInput
            label='Confirmar contraseña'
            type='password'
            autoComplete='new-password'
            error={showMismatch ? 'Las contraseñas no coinciden' : undefined}
            {...register('confirmPassword')}
          />

          <div className='flex flex-col gap-2 p-3.5 rounded-xl bg-surface-field'>
            <span className='text-[11px] font-semibold text-muted uppercase tracking-wide mb-0.5'>
              Tu contraseña debe tener
            </span>

            {requirements.map((req) => (
              <div key={req.id} className='flex items-center gap-2'>
                {req.met ? (
                  <svg
                    width='15'
                    height='15'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#10b981'
                    strokeWidth='2.4'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='shrink-0'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                ) : (
                  <svg
                    width='15'
                    height='15'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    className='shrink-0 text-muted'
                  >
                    <circle cx='12' cy='12' r='8.5' />
                  </svg>
                )}
                <span
                  className={cx(
                    'text-[13px]',
                    req.met ? 'text-foreground' : 'text-muted',
                  )}
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          <Button
            type='submit'
            className='w-full mt-1'
            loading={isSubmitting}
            disabled={!canSubmit || isSubmitting}
          >
            Guardar contraseña
          </Button>
        </form>
      </div>

      <span className='absolute bottom-6 left-0 right-0 text-center text-xs text-muted'>
        © DevTech 2026
      </span>
    </section>
  );
};

export default SetPasswordForm;
