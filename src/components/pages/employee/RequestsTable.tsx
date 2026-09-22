import { useState } from 'react';
import { LeaveRequest } from '@/contracts/interfaces/request';
import { StatusBadge } from '@/components/common/StatusBadge';
import { cx } from '@/helpers/cx';

interface Props {
  requests: LeaveRequest[];
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RequestsTable({ requests, isLoading, error, emptyMessage }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando solicitudes…</p>;
  }

  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (requests.length === 0) {
    return (
      <p className='text-sm text-muted'>
        {emptyMessage ?? 'Todavía no creaste ninguna solicitud.'}
      </p>
    );
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

      {requests.map((request) => {
        const isDenegada = request.estado === 'Denegada' && Boolean(request.motivoRechazo);
        const isExpanded = isDenegada && expandedIds.has(request.id);

        const cells = (
          <>
            <span className='text-sm font-medium text-foreground'>
              {request.tipo}
            </span>
            <span className='text-sm text-muted'>
              {formatFecha(request.fechaInicio)}
              {request.horaInicio && request.horaFin && (
                <span className='block text-xs'>
                  {request.horaInicio}–{request.horaFin}
                </span>
              )}
            </span>
            <span className='text-sm text-muted truncate pr-3' title={request.motivo}>
              {request.motivo}
            </span>
            <div className='flex items-center gap-2'>
              <StatusBadge status={request.estado} />
              {isDenegada && (
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className={cx(
                    'text-muted shrink-0 transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                >
                  <polyline points='6 9 12 15 18 9' />
                </svg>
              )}
            </div>
          </>
        );

        return (
          <div key={request.id} className='border-b border-border last:border-b-0'>
            {isDenegada ? (
              <button
                type='button'
                onClick={() => toggleExpanded(request.id)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} motivo del rechazo — ${request.tipo}`}
                className='w-full grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-4 items-center text-left hover:bg-surface-field/60'
              >
                {cells}
              </button>
            ) : (
              <div className='grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-4 items-center'>
                {cells}
              </div>
            )}

            {isExpanded && (
              <div className='px-5 pb-4'>
                <p className='text-xs text-muted leading-relaxed bg-surface-field rounded-lg p-3'>
                  <span className='font-semibold text-foreground'>Motivo del rechazo: </span>
                  {request.motivoRechazo}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
