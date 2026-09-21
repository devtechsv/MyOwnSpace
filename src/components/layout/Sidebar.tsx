import Link from 'next/link';
import { useLogout } from '@/hooks/useLogout';
import { useRouter } from 'next/router';
import { cx } from '@/helpers/cx';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/common/Button';

interface Props {
  onCreateRequest?: () => void;
}

function LogoutButton() {
  const handleLogout = useLogout();

  return (
    <button
      type='button'
      onClick={handleLogout}
      className='flex items-center gap-2.5 w-full px-4 py-3 rounded-[10px] border border-border text-sm font-medium text-muted hover:text-foreground'
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
        <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
        <polyline points='16 17 21 12 16 7' />
        <line x1='21' y1='12' x2='9' y2='12' />
      </svg>
      Cerrar sesión
    </button>
  );
}

const ADMIN_NAV_ITEMS = [
  {
    href: '/admin/requests',
    label: 'Solicitudes',
    icon: (
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
        <path d='M9 11l3 3L22 4' />
        <path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Usuarios',
    icon: (
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
        <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
        <circle cx='9' cy='7' r='4' />
        <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
        <path d='M16 3.13a4 4 0 0 1 0 7.75' />
      </svg>
    ),
  },
  {
    href: '/admin/pto',
    label: 'PTO',
    icon: (
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
        <rect x='3' y='4' width='18' height='18' rx='2' />
        <line x1='16' y1='2' x2='16' y2='6' />
        <line x1='8' y1='2' x2='8' y2='6' />
        <line x1='3' y1='10' x2='21' y2='10' />
      </svg>
    ),
  },
];

export function Sidebar({ onCreateRequest }: Props) {
  const session = useSession();
  const router = useRouter();

  if (!session) {
    return null;
  }

  return (
    <div className='flex flex-col justify-between h-full'>
      {session.rol === 'Administrador' ? (
        <nav className='flex flex-col gap-1'>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold',
                  isActive
                    ? 'bg-turquoise-blue-50 dark:bg-turquoise-blue-950/30 text-turquoise-blue-600 dark:text-turquoise-blue-400'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <div className='flex flex-col gap-2'>
          <Button
            type='button'
            onClick={onCreateRequest}
            className='w-full justify-center gap-2'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M12 5v14M5 12h14' />
            </svg>
            Crear solicitud
          </Button>
          <Link
            href='/pto'
            className={cx(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-semibold',
              router.pathname === '/pto'
                ? 'bg-turquoise-blue-50 dark:bg-turquoise-blue-950/30 text-turquoise-blue-600 dark:text-turquoise-blue-400'
                : 'text-muted hover:text-foreground',
            )}
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
              <rect x='3' y='4' width='18' height='18' rx='2' />
              <line x1='16' y1='2' x2='16' y2='6' />
              <line x1='8' y1='2' x2='8' y2='6' />
              <line x1='3' y1='10' x2='21' y2='10' />
            </svg>
            Mi PTO
          </Link>
        </div>
      )}
      <div className='flex flex-col gap-4'>
        <LogoutButton />
        <span className='text-[11px] text-muted text-center'>© DevTech 2026</span>
      </div>
    </div>
  );
}
