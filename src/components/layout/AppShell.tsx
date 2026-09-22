import { ReactNode, useEffect, useState } from 'react';
import { Topbar } from './Topbar';

interface Props {
  children: ReactNode;
  sidebar: ReactNode;
}

export function AppShell({ children, sidebar }: Props) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    if (!isNavOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNavOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isNavOpen]);

  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <Topbar onMenuClick={() => setIsNavOpen(true)} />
      <div className='flex-1 flex min-h-0'>
        <aside className='hidden lg:block w-60 shrink-0 bg-surface border-r border-border p-4'>
          {sidebar}
        </aside>

        {isNavOpen && (
          <div className='fixed inset-0 z-40 flex lg:hidden'>
            <div
              className='fixed inset-0 bg-black/40'
              aria-hidden='true'
              onClick={() => setIsNavOpen(false)}
            />
            <aside className='relative z-50 w-64 max-w-[80%] h-full bg-surface border-r border-border p-4 flex flex-col overflow-y-auto'>
              <button
                type='button'
                onClick={() => setIsNavOpen(false)}
                aria-label='Cerrar menú'
                className='self-end mb-2 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-field'
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
              {sidebar}
            </aside>
          </div>
        )}

        <main className='flex-1 p-8 md:p-10 overflow-y-auto'>{children}</main>
      </div>
    </div>
  );
}