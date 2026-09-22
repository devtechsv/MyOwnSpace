import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

const NotFoundPage = () => {
  return (
    <section className='min-h-screen relative bg-background px-5 grid place-content-center'>
      <ThemeToggle className='absolute top-6 right-6' />

      <div className='w-full max-w-[420px] text-center'>
        <Image
          src='/logo.png'
          alt='Logo DevTech'
          width={48}
          height={48}
          className='mx-auto mb-6 opacity-70'
        />

        <div className='text-7xl font-bold text-border leading-none mb-3'>
          404
        </div>

        <h1 className='text-xl font-bold text-foreground mb-2.5'>
          Esta página no existe
        </h1>
        <p className='text-sm text-muted leading-relaxed mb-7'>
          La dirección a la que intentaste acceder no está disponible.
          Revisa el enlace o vuelve al inicio.
        </p>

        <Button component={Link} href='/'>
          Volver al inicio
        </Button>
      </div>

      <span className='absolute bottom-6 left-0 right-0 text-center text-xs text-muted'>
        © DevTech 2026
      </span>
    </section>
  );
};

export default NotFoundPage;
