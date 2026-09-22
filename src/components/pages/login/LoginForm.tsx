import Image from 'next/image';
import Link from 'next/link';
import useLoginForm from './useLoginForm';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    serverError,
    isSubmitting,
    sessionExpired,
  } = useLoginForm();

  return (
    <section className='min-h-screen relative bg-background px-5 grid place-content-center'>
      <ThemeToggle className='absolute top-6 right-6' />

      <div className='w-full max-w-[400px] bg-surface border border-border rounded-2xl shadow-lg px-9 py-10'>
        <Image
          src='/logo.png'
          alt='Logo DevTech'
          width={64}
          height={64}
          className='mx-auto mb-5'
        />

        <h1 className='text-center text-2xl font-bold text-foreground'>
          Bienvenido a{' '}
          <span className='text-turquoise-blue-400'>DevTech</span>
        </h1>
        <p className='text-center text-sm text-muted mt-1.5 mb-7'>
          Iniciá sesión para continuar
        </p>

        {sessionExpired && (
          <div className='mb-5 flex items-start gap-2.5 rounded-[10px] bg-amber-50 dark:bg-amber-950/20 px-4 py-3'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='shrink-0 mt-0.5 text-amber-700 dark:text-amber-400'
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
            <span className='text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-300'>
              Tu sesión expiró por inactividad. Iniciá sesión nuevamente
              para continuar.
            </span>
          </div>
        )}

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
            label='Correo electrónico'
            type='email'
            autoComplete='email'
            error={errors.email?.message}
            {...register('email')}
          />

          <TextInput
            label='Contraseña'
            type='password'
            autoComplete='current-password'
            error={errors.password?.message}
            {...register('password')}
          />

          <div className='flex justify-end -mt-2'>
            <Link
              href='/forgot-password'
              className='text-[12.5px] font-semibold text-turquoise-blue-600 hover:text-turquoise-blue-700'
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type='submit' className='w-full mt-1' loading={isSubmitting}>
            Ingresar
          </Button>
        </form>
      </div>

      <span className='absolute bottom-6 left-0 right-0 text-center text-xs text-muted'>
        © DevTech 2026
      </span>
    </section>
  );
};

export default LoginForm;
