import { useState } from 'react';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/common/Button';
import { PtoCalendar } from '@/components/pages/pto/PtoCalendar';
import { RequestPtoModal } from '@/components/pages/pto/RequestPtoModal';
import { VacationRangeModal } from '@/components/pages/pto/VacationRangeModal';
import { usePto } from '@/components/pages/pto/usePto';

interface Props {}

// ISO (yyyy-mm-dd) → dd/mm/yyyy, sin pasar por Date (evita corrimientos
// de zona horaria).
function formatearFecha(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const PtoPage: NextPage<Props> = () => {
  const { balance, reservas, isLoading, error, reload, reclamar, isClaiming } = usePto();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [isRangoOpen, setIsRangoOpen] = useState(false);

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='flex flex-wrap items-start justify-between gap-3 mb-6'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>Mi PTO</h1>
          <p className='text-sm text-muted mt-1'>
            Reclama tus horas acumuladas y solicita tus vacaciones.
          </p>
        </div>
        <Button onClick={() => setIsRangoOpen(true)} disabled={!balance}>
          Solicitar vacaciones
        </Button>
      </div>

      {error && (
        <div role='alert' className='mb-4 text-sm text-red-500'>
          {error}
        </div>
      )}

      {isLoading || !balance ? (
        <p className='mb-6 text-sm text-muted'>Cargando tu PTO…</p>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6'>
          <section aria-label='Horas acumuladas' className='p-4 rounded-xl border border-border bg-surface flex flex-col gap-2'>
            <span className='text-xs font-semibold text-muted uppercase tracking-wide'>Acumuladas</span>
            <span className='text-2xl font-bold text-foreground'>{balance.horasAcumuladas}h</span>
            <span className='text-xs text-muted'>
              Reclámalas antes del {formatearFecha(balance.fechaLimiteReclamo)} o se pierden.
            </span>
            <Button
              onClick={reclamar}
              loading={isClaiming}
              disabled={balance.horasAcumuladas <= 0}
              className='mt-auto'
            >
              Reclamar
            </Button>
          </section>

          <section aria-label='Horas reclamadas por habilitar' className='p-4 rounded-xl border border-border bg-surface flex flex-col gap-2'>
            <span className='text-xs font-semibold text-muted uppercase tracking-wide'>Reclamadas por habilitar</span>
            <span className='text-2xl font-bold text-amber-500'>{balance.horasReclamadasBloqueadas}h</span>
            <span className='text-xs text-muted'>
              Se habilitan el {formatearFecha(balance.fechaProximaHabilitacion)}, al cumplir tu año laboral.
            </span>
            <span className='text-xs text-muted'>
              Días trabajados este año laboral: {balance.diasTrabajadosAnioLaboral} (mínimo{' '}
              {balance.diasTrabajadosMinimos}, art. 180).
            </span>
          </section>

          <section aria-label='Horas disponibles' className='p-4 rounded-xl border border-border bg-turquoise-blue-50 dark:bg-turquoise-blue-950/20 flex flex-col gap-2'>
            <span className='text-xs font-semibold text-muted uppercase tracking-wide'>Disponibles</span>
            <span className='text-2xl font-bold text-foreground'>{balance.horasDisponibles}h</span>
            <span className='text-xs text-muted'>
              Listas para usar. Las solicitudes pendientes ya están descontadas.
            </span>
          </section>
        </div>
      )}

      <PtoCalendar reservas={reservas} onSelectDate={setFechaSeleccionada} />

      {fechaSeleccionada && (
        <RequestPtoModal
          isOpen
          fecha={fechaSeleccionada}
          onClose={() => setFechaSeleccionada(null)}
          onCreated={reload}
        />
      )}

      {balance && isRangoOpen && (
        <VacationRangeModal
          isOpen
          horasDisponibles={balance.horasDisponibles}
          onClose={() => setIsRangoOpen(false)}
          onCreated={reload}
        />
      )}
    </AppShell>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async () => {
    return { props: {} };
  },
  { roles: ['Empleado'] },
);

export default PtoPage;
