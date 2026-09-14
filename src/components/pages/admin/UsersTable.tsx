import { User } from '@/contracts/interfaces/user';
import { UserStatusBadge } from '@/components/common/UserStatusBadge';
import { getInitials } from '@/helpers/get-initials';

interface Props {
  users: User[];
  isLoading: boolean;
  error: string | null;
  currentUserId?: string;
  onEdit?: (user: User) => void;
  onResetPassword?: (user: User) => void;
  onToggleStatus?: (user: User) => void;
}

export function UsersTable({
  users,
  isLoading,
  error,
  currentUserId,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: Props) {
  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando usuarios…</p>;
  }

  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (users.length === 0) {
    return <p className='text-sm text-muted'>Todavía no hay usuarios.</p>;
  }

  return (
    <div className='border border-border rounded-2xl overflow-hidden bg-surface'>
      <div className='grid grid-cols-[2.2fr_1.2fr_1fr_1.6fr] px-5 py-3.5 bg-surface-field border-b border-border'>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Usuario
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Rol
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Estado
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Acciones
        </span>
      </div>

      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        return (
          <div
            key={user.id}
            className='grid grid-cols-[2.2fr_1.2fr_1fr_1.6fr] px-5 py-3.5 border-b border-border last:border-b-0 items-center'
          >
            <div className='flex items-center gap-2.5'>
              <span className='w-8 h-8 rounded-full bg-surface-field text-muted flex items-center justify-center text-xs font-semibold shrink-0'>
                {getInitials(user.nombre)}
              </span>
              <div className='flex flex-col leading-tight'>
                <span className='text-sm font-medium text-foreground flex items-center gap-1.5'>
                  {user.nombre}
                  {isSelf && (
                    <span className='text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-turquoise-blue-50 dark:bg-turquoise-blue-950/40 text-turquoise-blue-600 dark:text-turquoise-blue-400'>
                      TÚ
                    </span>
                  )}
                </span>
                <span className='text-xs text-muted'>{user.correo}</span>
              </div>
            </div>
            <span className='text-sm text-muted'>{user.rol}</span>
            <span>
              <UserStatusBadge status={user.estado} />
            </span>
            <div className='flex gap-1.5'>
              <button
                type='button'
                title='Editar'
                onClick={() => onEdit?.(user)}
                className='w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                  <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                </svg>
              </button>

              {user.estado === 'Activo' && (
                <button
                  type='button'
                  title='Resetear contraseña'
                  onClick={() => onResetPassword?.(user)}
                  className='w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground flex items-center justify-center'
                >
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <circle cx='8' cy='16' r='3.2' />
                    <path d='M10.3 13.7L19 5l2 2M15 6l2 2' />
                  </svg>
                </button>
              )}

              {user.estado === 'Activo' && (
                <button
                  type='button'
                  title='Desactivar'
                  onClick={() => onToggleStatus?.(user)}
                  className='w-8 h-8 rounded-lg border border-red-500 text-red-500 flex items-center justify-center'
                >
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M18.36 6.64a9 9 0 1 1-12.73 0' />
                    <line x1='12' y1='2' x2='12' y2='12' />
                  </svg>
                </button>
              )}

              {user.estado === 'Desactivado' && (
                <button
                  type='button'
                  title='Activar'
                  onClick={() => onToggleStatus?.(user)}
                  className='w-8 h-8 rounded-lg border border-emerald-500 text-emerald-500 flex items-center justify-center'
                >
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M18.36 6.64a9 9 0 1 1-12.73 0' />
                    <line x1='12' y1='2' x2='12' y2='12' />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
