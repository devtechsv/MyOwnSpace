import { RequestStatus } from '@/contracts/interfaces/request';

const STYLES: Record<RequestStatus, string> = {
  Pendiente:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
  Aprobada:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400',
  Denegada: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
};

interface Props {
  status: RequestStatus;
  title?: string;
}

export function StatusBadge({ status, title }: Props) {
  return (
    <span
      title={title}
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
