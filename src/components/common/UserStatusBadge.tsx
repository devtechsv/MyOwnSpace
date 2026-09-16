import { UserStatus } from '@/contracts/interfaces/user';

const STYLES: Record<UserStatus, string> = {
  Activo:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
  Pendiente:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  Desactivado:
    'bg-slate-200 text-slate-700 dark:bg-slate-800/60 dark:text-slate-400',
};

interface Props {
  status: UserStatus;
}

export function UserStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
