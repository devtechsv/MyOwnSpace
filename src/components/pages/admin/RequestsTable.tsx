import { useState } from 'react';
import { AdminRequestRow } from './useAdminRequests';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DenyRequestModal } from './DenyRequestModal';

interface Props {
  requests: AdminRequestRow[];
  isLoading: boolean;
  error: string | null;
  actioningId: string | null;
  onApprove: (id: string) => void;
  onDeny: (id: string, motivo: string) => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RequestsTable({
  requests,
  isLoading,
  error,
  actioningId,
  onApprove,
  onDeny,
}: Props) {
  const [denyingRequest, setDenyingRequest] = useState<AdminRequestRow | null>(null);

  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando solicitudes…</p>;
  }

  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <p className='text-sm text-muted'>No hay solicitudes para este filtro.</p>
    );
  }

  return (
    <div className='border border-border rounded-2xl overflow-hidden bg-surface'>
      <div className='grid grid-cols-[1.4fr_1.1fr_1fr_2fr_1.3fr] px-5 py-3.5 bg-surface-field border-b border-border'>
        <span className='text-xs font-semibold text-muted uppercase tracking-wide'>
          Empleado
        </span>
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
          Acciones
        </span>
      </div>

      {requests.map((request) => {
        const isActioning = actioningId === request.id;
        return (
          <div
            key={request.id}
            className='grid grid-cols-[1.4fr_1.1fr_1fr_2fr_1.3fr] px-5 py-4 border-b border-border last:border-b-0 items-center'
          >
            <div className='flex items-center gap-2.5'>
              <span className='w-7 h-7 rounded-full bg-surface-field text-muted flex items-center justify-center text-[11px] font-semibold shrink-0'>
                {request.employeeInitials}
              </span>
              <span className='text-sm font-medium text-foreground'>
                {request.employeeName}
              </span>
            </div>
            <span className='text-sm text-muted'>{request.tipo}</span>
            <span className='text-sm text-muted'>
              {formatFecha(request.fechaInicio)}
            </span>
            <span className='text-sm text-muted truncate pr-3' title={request.motivo}>
              {request.motivo}
            </span>
            {request.estado === 'Pendiente' ? (
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => onApprove(request.id)}
                  disabled={isActioning}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                  Aprobar
                </button>
                <button
                  type='button'
                  onClick={() => setDenyingRequest(request)}
                  disabled={isActioning}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 text-red-500 text-xs font-semibold disabled:opacity-50'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <line x1='18' y1='6' x2='6' y2='18' />
                    <line x1='6' y1='6' x2='18' y2='18' />
                  </svg>
                  Denegar
                </button>
              </div>
            ) : (
              <span>
                <StatusBadge
                  status={request.estado}
                  title={request.estado === 'Denegada' ? request.motivoRechazo : undefined}
                />
              </span>
            )}
          </div>
        );
      })}

      <DenyRequestModal
        request={denyingRequest}
        onClose={() => setDenyingRequest(null)}
        onConfirm={(motivo) => {
          if (denyingRequest) onDeny(denyingRequest.id, motivo);
          setDenyingRequest(null);
        }}
      />
    </div>
  );
}
