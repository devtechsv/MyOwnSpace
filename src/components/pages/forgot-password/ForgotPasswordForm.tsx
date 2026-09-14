import Image from 'next/image';
import Link from 'next/link';
import useForgotPasswordForm from './useForgotPasswordForm';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const ForgotPasswordForm = () => {
  const { register, handleSubmit, onSubmit, errors, isSubmitting } =
    useForgotPasswordForm();

  return (
    <section className='min-h-screen relative bg-background px-5 grid place-content-center'>
      <ThemeToggle className='absolute top-6 right-6' />

      <div className='w-full max-w-[400px] bg-surface border border-border rounded-2xl shadow-lg px-9 py-10'>
        <Link
          href='/login'
          className='flex items-center gap-2 text-muted hover:text-foreground mb-5 text-[13px] font-semibold'
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='19' y1='12' x2='5' y2='12' />
            <polyline points='12 19 5 12 12 5' />
          </svg>
          Volver a inicio de sesión
        </Link>

        <Image
          src='/logo.png'
          alt='Logo DevTech'
          width={56}
          height={56}
          className='mx-auto mb-4'
        />

        <h1 className='text-center text-xl font-bold text-foreground'>
          ¿Olvidaste tu contraseña?
        </h1>
        <p className='text-center text-sm text-muted mt-1.5 mb-7 leading-relaxed'>
          Ingresá tu correo y te enviaremos las instrucciones para
          restablecerla.
        </p>

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

          <Button
            type='submit'
            className='w-full py-3 mt-1'
            loading={isSubmitting}
          >
            Enviar instrucciones
          </Button>
        </form>
      </div>

      <span className='absolute bottom-6 left-0 right-0 text-center text-xs text-muted'>
        © DevTech 2026
      </span>
    </section>
  );
};

export default ForgotPasswordForm;
