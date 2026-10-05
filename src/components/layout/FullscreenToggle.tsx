import { useEffect, useState } from 'react';
import { cx } from '@/helpers/cx';

interface Props {
  className?: string;
}

// Usa la Fullscreen API sobre <html>, así la pantalla completa sobrevive
// a la navegación client-side de Next (login → panel) sin depender de F11.
export function FullscreenToggle({ className }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement !== null);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // El navegador puede rechazarlo (iframe, permisos, iOS Safari):
      // no hay nada que hacer más que dejar el estado como está.
    }
  };

  const label = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';

  return (
    <button
      type='button'
      onClick={toggleFullscreen}
      aria-label={label}
      title={label}
      className={cx(
        'w-10 h-10 rounded-[10px] border border-border bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors',
        className,
      )}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        {isFullscreen ? (
          <path d='M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3' />
        ) : (
          <path d='M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3' />
        )}
      </svg>
    </button>
  );
}
