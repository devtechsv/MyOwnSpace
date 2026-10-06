import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/form/TextInput';
import { useModalAlly } from '@/hooks/useModalAlly';
import { useSession } from '@/hooks/useSession';
import { errorMessage } from '@/helpers/error-message';
import { hoyIso } from '@/helpers/hoy-iso';
import { contarDiasHabiles, esDiaHabil, HORAS_POR_DIA } from '@/lib/dias-habiles';
import API from '@/services/api-services';

interface Props {
  isOpen: boolean;
  horasDisponibles: number;
  onClose: () => void;
  onCreated?: () => void;
}

// Vacaciones por rango: solo cuentan lunes a viernes a 8h (art. 178), y
// la solicitud queda Pendiente hasta que un administrador la apruebe.
export function VacationRangeModal({ isOpen, horasDisponibles, onClose, onCreated }: Props) {
  const session = useSession();
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const containerRef = useModalAlly(isOpen, onClose, isSubmitting);

  if (!isOpen) return null;

  const hoy = hoyIso();
  const completo = Boolean(fechaInicio && fechaFin);
  const dias = completo && fechaFin >= fechaInicio ? contarDiasHabiles(fechaInicio, fechaFin) : 0;
  const horas = dias * HORAS_POR_DIA;

  // Mismas reglas que el backend: el aviso aparece antes de enviar.
  let validacion: string | null = null;
  if (fechaInicio && fechaInicio < hoy) {
    validacion = 'No puedes solicitar vacaciones en fechas pasadas.';
  } else if (fechaInicio && !esDiaHabil(fechaInicio)) {
    validacion = 'Las vacaciones no pueden iniciar en sábado ni domingo.';
  } else if (completo && fechaFin < fechaInicio) {
    validacion = 'La fecha de fin no puede ser anterior a la fecha de inicio.';
  } else if (completo && horas > horasDisponibles) {
    validacion = `No tienes horas suficientes: necesitas ${horas}h y tienes ${horasDisponibles}h disponibles.`;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !completo || validacion) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      await API.pto.createVacationRequest(session.userId, {
        fechaInicio,
        fechaFin,
        motivo: motivo.trim() || undefined,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err, 'No pudimos enviar la solicitud de vacaciones.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Solicitar vacaciones'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'
    >
      <div
        ref={containerRef}
        className='w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg px-7 py-8'
      >
        <div className='flex items-center justify-between mb-5'>
          <h2 className='text-base font-bold text-foreground'>Solicitar vacaciones</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='Cerrar'
            className='text-muted hover:text-foreground'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {serverError && (
          <div
            role='alert'
            className='mb-4 rounded-[10px] bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400'
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className='flex flex-col gap-4' noValidate>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <TextInput
              label='Fecha de inicio'
              name='fechaInicio'
              type='date'
              min={hoy}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
            <TextInput
              label='Fecha de fin'
              name='fechaFin'
              type='date'
              min={fechaInicio || hoy}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <TextInput
            label='Comentario (opcional)'
            name='motivo'
            maxLength={1000}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          <div className='p-3.5 rounded-xl bg-surface-field text-[13px] text-foreground'>
            {validacion ? (
              <span role='alert' className='text-red-500'>{validacion}</span>
            ) : completo ? (
              <span>
                <strong>{dias}</strong> día{dias === 1 ? '' : 's'} hábil{dias === 1 ? '' : 'es'} ={' '}
                <strong>{horas}h</strong> de tus {horasDisponibles}h disponibles.
              </span>
            ) : (
              <span className='text-muted'>
                Solo se descuentan los días de lunes a viernes (8h cada uno). Un
                administrador debe aprobar la solicitud.
              </span>
            )}
          </div>

          <div className='flex justify-end gap-2.5 mt-1'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='px-4 py-2.5 rounded-[10px] border border-border text-sm font-semibold text-foreground disabled:opacity-50'
            >
              Cancelar
            </button>
            <Button type='submit' loading={isSubmitting} disabled={!completo || Boolean(validacion)}>
              Enviar solicitud
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
