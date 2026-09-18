import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useLogout } from '@/hooks/useLogout';
import { useSession } from '@/hooks/useSession';
import { getInitials } from '@/helpers/get-initials';
import { ThemeToggle } from './ThemeToggle';
import { ChangePasswordModal } from '@/components/common/ChangePasswordModal';

export function Topbar() {
  const session = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = useLogout();

  return (
    <header className='h-[72px] shrink-0 flex items-center justify-between px-8 bg-surface border-b border-border'>
      <div className='flex items-center gap-3'>
        <Image src='/logo.png' alt='MyOwnSpace' width={32} height={32} />
        <span className='text-[17px] font-semibold text-foreground'>
          MyOwnSpace
        </span>
      </div>

      <div className='flex items-center gap-4 relative' ref={menuRef}>
        <ThemeToggle />

        <div className='w-px h-6 bg-border' aria-hidden='true' />

        {session && (
          <>
            <button
              type='button'
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-haspopup='menu'
              aria-expanded={isMenuOpen}
              className='flex items-center gap-2.5'
            >
              <span className='w-9 h-9 rounded-full bg-turquoise-blue-500 text-white flex items-center justify-center text-[13px] font-semibold'>
                {getInitials(session.nombre)}
              </span>
              <span className='flex flex-col items-start leading-tight'>
                <span className='text-[13px] font-semibold text-foreground'>
                  {session.nombre}
                </span>
                <span className='text-xs text-muted'>{session.rol}</span>
              </span>
            </button>

            {isMenuOpen && (
              <div
                role='menu'
                className='absolute top-[52px] right-0 w-[200px] bg-surface border border-border rounded-xl shadow-lg p-1.5 flex flex-col'
              >
                <button
                  type='button'
                  role='menuitem'
                  className='text-left px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surface-field'
                >
                  Perfil
                </button>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className='text-left px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-surface-field'
                >
                  Cambiar contraseña
                </button>
                <div className='h-px bg-border my-1' />
                <button
                  type='button'
                  role='menuitem'
                  onClick={handleLogout}
                  className='text-left px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-surface-field'
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            <ChangePasswordModal
              isOpen={isChangePasswordOpen}
              onClose={() => setIsChangePasswordOpen(false)}
            />
          </>
        )}
      </div>
    </header>
  );
}
