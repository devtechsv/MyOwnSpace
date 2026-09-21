import { LeaveRequest } from '@/contracts/interfaces/request';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Props {
  requests: LeaveRequest[];
  isLoading: boolean;
  error: string | null;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RequestsTable({ requests, isLoading, error }: Props) {
  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando solicitudes…</p>;
  }

  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <p className='text-sm text-muted'>
        Todavía no creaste ninguna solicitud.
      </p>
    );
  }

  return (
    <div className='border border-border rounded-2xl overflow-hidden bg-surface'>
      <div className='grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-3.5 bg-surface-field border-b border-border'>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Tipo
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Fecha
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Motivo
        </span>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Estado
        </span>
      </div>

      {requests.map((request) => (
        <div
          key={request.id}
          className='grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-4 border-b border-border last:border-b-0 items-center'
        >
          <span className='text-sm font-medium text-foreground'>
            {request.tipo}
          </span>
          <span className='text-sm text-muted'>
            {formatFecha(request.fechaInicio)}
          </span>
          <span className='text-sm text-muted truncate pr-3' title={request.motivo}>
            {request.motivo}
          </span>
          <span>
            <StatusBadge
            status={request.estado}
            title={request.estado === 'Denegada' ? request.motivoRechazo : undefined} />
          </span>
        </div>
      ))}
    </div>
  );
}
