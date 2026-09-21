import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { useModalAlly } from '@/hooks/useModalAlly';
import { AdminRequestRow } from './useAdminRequests';

interface Props {
  request: AdminRequestRow | null;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function DenyRequestModal({ request, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');

  const handleClose = () => {
    setMotivo('');
    onClose();
  };

  const containerRef = useModalAlly(request !== null, handleClose);

  if (!request) return null;

  const canSubmit = motivo.trim().length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(motivo.trim());
    setMotivo('');
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={`Denegar solicitud de ${request.employeeName}`}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div ref={containerRef} className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'>
        <h2 className='text-base font-bold text-foreground mb-2'>
          Denegar solicitud de {request.employeeName}
        </h2>
        <p className='text-[13px] text-muted leading-relaxed mb-5'>
          Este motivo se le va a mostrar al empleado junto con su solicitud.
        </p>

        <label htmlFor='motivoRechazo' className='text-xs font-semibold text-muted'>
          Motivo del rechazo
        </label>
        <textarea
          id='motivoRechazo'
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className='w-full mt-1.5 px-3.5 py-3 border border-border rounded-[10px] bg-surface-field text-sm text-foreground focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40 resize-none'
          placeholder='Explicá brevemente por qué se deniega...'
        />

        <div className='flex gap-2.5 mt-5'>
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground'
          >
            Cancelar
          </button>
          <Button type='button' onClick={handleConfirm} disabled={!canSubmit} className='flex-1'>
            Denegar
          </Button>
        </div>
      </div>
    </div>
  );
}
