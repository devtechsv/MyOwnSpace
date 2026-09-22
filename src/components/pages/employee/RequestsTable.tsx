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
      <div className='hidden md:grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-3.5 bg-surface-field border-b border-border'>
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
        const hasRechazo = request.estado === 'Denegada' && Boolean(request.motivoRechazo);
        const isExpanded = expandedIds.has(request.id);

        const verMotivoButton = (
          <button
            type='button'
            onClick={() => toggleExpanded(request.id)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Ocultar' : 'Ver'} motivo completo — ${request.tipo}`}
            className='shrink-0 p-1 rounded text-muted hover:text-foreground'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={cx('transition-transform', isExpanded && 'rotate-180')}
            >
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </button>
        );

        const desktopRow = (
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
            <div className='flex items-center gap-1 min-w-0 pr-3'>
              <span className='text-sm text-muted truncate min-w-0'>
                {request.motivo}
              </span>
              {verMotivoButton}
            </div>
            <StatusBadge status={request.estado} />
          </>
        );

        const mobileCard = (
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-medium text-foreground'>
                {request.tipo}
              </span>
              <StatusBadge status={request.estado} />
            </div>

            <div>
              <span className='block text-[11px] font-semibold text-muted uppercase tracking-wide'>
                Fecha
              </span>
              <span className='text-sm text-foreground'>
                {formatFecha(request.fechaInicio)}
                {request.horaInicio && request.horaFin && (
                  <span className='block text-xs text-muted'>
                    {request.horaInicio}–{request.horaFin}
                  </span>
                )}
              </span>
            </div>

            <div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[11px] font-semibold text-muted uppercase tracking-wide'>
                  Motivo
                </span>
                {verMotivoButton}
              </div>
              <p className='text-sm text-foreground truncate'>{request.motivo}</p>
            </div>
          </div>
        );

        return (
          <div key={request.id} className='border-b border-border last:border-b-0'>
            <div
              data-testid='fila-desktop'
              className='hidden md:grid grid-cols-[1.3fr_1fr_2.2fr_1fr] px-5 py-4 items-center'
            >
              {desktopRow}
            </div>
            <div data-testid='fila-mobile' className='md:hidden px-4 py-4'>
              {mobileCard}
            </div>

            {isExpanded && (
              <div
                data-testid='motivo-expandido'
                className='px-4 md:px-5 pb-4 flex flex-col gap-2'
              >
                <p className='text-xs text-muted leading-relaxed bg-surface-field rounded-lg p-3'>
                  <span className='font-semibold text-foreground'>Motivo: </span>
                  {request.motivo}
                </p>
                {hasRechazo && (
                  <p className='text-xs text-muted leading-relaxed bg-surface-field rounded-lg p-3'>
                    <span className='font-semibold text-foreground'>Motivo del rechazo: </span>
                    {request.motivoRechazo}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
