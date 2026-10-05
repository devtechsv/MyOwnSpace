import { useState } from 'react';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PtoCalendar } from '@/components/pages/pto/PtoCalendar';
import { RequestPtoModal } from '@/components/pages/pto/RequestPtoModal';
import { usePto } from '@/components/pages/pto/usePto';

interface Props {}

// ISO (yyyy-mm-dd) → dd/mm/yyyy, sin pasar por Date (evita corrimientos
// de zona horaria).
function formatearFecha(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const PtoPage: NextPage<Props> = () => {
  const { balance, reservas, isLoading, error, reload } = usePto();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>Mi PTO</h1>
        <p className='text-sm text-muted mt-1'>
          Consulta tu balance y reserva días u horas libres.
        </p>
      </div>

      <div className='mb-6 flex flex-wrap gap-3'>
        <div className='inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-turquoise-blue-50 dark:bg-turquoise-blue-950/20'>
          <span className='text-sm text-muted'>Balance disponible:</span>
          <span className='text-lg font-bold text-foreground'>
            {isLoading || !balance ? '…' : `${balance.horasDisponibles}h`}
          </span>
        </div>
        {/* Las horas se ganan en un periodo (por aniversario de ingreso)
            y se usan en el siguiente — esto es lo que viene en camino. */}
        {!isLoading && balance && (
          <div className='inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-surface'>
            <span className='text-sm text-muted'>En acumulación:</span>
            <span className='text-lg font-bold text-foreground'>
              {balance.horasEnAcumulacion}h
            </span>
            <span className='text-xs text-muted'>
              disponibles desde el {formatearFecha(balance.fechaProximoPeriodo)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div role='alert' className='mb-4 text-sm text-red-500'>
          {error}
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
