import { useState } from 'react';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/common/Button';
import { RequestsTable } from '@/components/pages/employee/RequestsTable';
import { CreateRequestModal } from '@/components/pages/employee/CreateRequestModal';
import {
  EmployeeRequestsTipoFilter,
  useEmployeeRequests,
} from '@/components/pages/employee/useEmployeeRequests';

interface Props {}

const TIPO_FILTER_OPTIONS: { value: EmployeeRequestsTipoFilter; label: string }[] = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'Emergencia', label: 'Emergencia' },
  { value: 'Enfermedad', label: 'Enfermedad' },
  { value: 'Permiso personal', label: 'Permiso personal' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Otro', label: 'Otro' },
];

const Home: NextPage<Props> = () => {
  const {
    requests,
    isLoading,
    error,
    reload,
    tipoFiltro,
    setTipoFiltro,
    fechaFiltro,
    setFechaFiltro,
  } = useEmployeeRequests();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>Mis solicitudes</h1>
        <p className='text-sm text-muted mt-1'>
          Consultá el estado de tus permisos y solicitudes.
        </p>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as EmployeeRequestsTipoFilter)}
            aria-label='Filtrar por tipo de solicitud'
            className='px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40'
          >
            {TIPO_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            type='date'
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            aria-label='Filtrar por fecha'
            className='px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40'
          />
        </div>

        <Button type='button' onClick={() => setIsCreateOpen(true)}>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M12 5v14M5 12h14' />
          </svg>
          Crear solicitud
        </Button>
      </div>

      <RequestsTable
        requests={requests}
        isLoading={isLoading}
        error={error}
        emptyMessage={
          tipoFiltro !== 'Todos' || fechaFiltro
            ? 'No hay solicitudes que coincidan con estos filtros.'
            : undefined
        }
      />

      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={reload}
      />
    </AppShell>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context, session) => {
    return {
      props: {},
    };
  },
  { roles: ['Empleado'] },
);

export default Home;
