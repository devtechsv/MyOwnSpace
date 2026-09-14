import Link from 'next/link';
import { useRouter } from 'next/router';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const ForgotPasswordSent = () => {
  const router = useRouter();
  const correo =
    typeof router.query.correo === 'string'
      ? router.query.correo
      : 'tu correo';

  return (
    <section className='min-h-screen relative bg-background px-5 grid place-content-center'>
      <ThemeToggle className='absolute top-6 right-6' />

      <div className='w-full max-w-[400px] bg-surface border border-border rounded-2xl shadow-lg px-9 py-10 text-center'>
        <div className='w-14 h-14 rounded-full bg-turquoise-blue-50 dark:bg-turquoise-blue-950/40 text-turquoise-blue-600 dark:text-turquoise-blue-400 flex items-center justify-center mx-auto mb-5'>
          <svg
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
            <polyline points='22 6 12 13 2 6' />
          </svg>
        </div>

        <h1 className='text-xl font-bold text-foreground mb-2.5'>
          Revisá tu correo
        </h1>
        <p className='text-sm text-muted leading-relaxed mb-7'>
          Si <strong className='text-foreground'>{correo}</strong> está
          registrado, vas a recibir un enlace para restablecer tu
          contraseña en los próximos minutos.
        </p>

        <Link
          href='/login'
          className='inline-flex items-center gap-2 text-turquoise-blue-600 hover:text-turquoise-blue-700 text-[13px] font-semibold'
        >
          <svg
            width='15'
            height='15'
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
      </div>

      <span className='absolute bottom-6 left-0 right-0 text-center text-xs text-muted'>
        © DevTech 2026
      </span>
    </section>
  );
};

export default ForgotPasswordSent;
