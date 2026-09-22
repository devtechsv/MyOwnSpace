import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { RequestsTable } from '@/components/pages/admin/RequestsTable';
import { Pagination } from '@/components/common/Pagination';
import {
  AdminRequestsFilter,
  AdminRequestsTipoFilter,
  useAdminRequests,
} from '@/components/pages/admin/useAdminRequests';

interface Props {}

const TABS: { key: AdminRequestsFilter; label: string }[] = [
  { key: 'Pendiente', label: 'Pendientes' },
  { key: 'Aprobada', label: 'Aprobadas' },
  { key: 'Denegada', label: 'Denegadas' },
  { key: 'Todas', label: 'Todas' },
];

const TIPO_FILTER_OPTIONS: { value: AdminRequestsTipoFilter; label: string }[] = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'Emergencia', label: 'Emergencia' },
  { value: 'Enfermedad', label: 'Enfermedad' },
  { value: 'Permiso personal', label: 'Permiso personal' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Otro', label: 'Otro' },
];

const AdminRequestsPage: NextPage<Props> = () => {
  const {
    requests,
    totalCount,
    page,
    totalPages,
    setPage,
    isLoading,
    error,
    actioningId,
    approve,
    deny,
    filtro,
    setFiltro,
    nombreQuery,
    setNombreQuery,
    tipoFiltro,
    setTipoFiltro,
    fechaFiltro,
    setFechaFiltro,
  } = useAdminRequests();

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>
          Solicitudes del equipo
        </h1>
        <p className='text-sm text-muted mt-1'>
          Revisá y aprobá o denegá las solicitudes de permisos.
        </p>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
        <div className='flex gap-2'>
          {TABS.map((tab) => {
            const isActive = filtro === tab.key;
            return (
              <button
                key={tab.key}
                type='button'
                onClick={() => setFiltro(tab.key)}
                className={
                  isActive
                    ? 'px-4 py-2 rounded-full bg-turquoise-blue-500 text-white text-sm font-semibold'
                    : 'px-4 py-2 rounded-full border border-border text-muted text-sm font-medium'
                }
              >
                {tab.label}
                {isActive && !isLoading ? ` · ${totalCount}` : ''}
              </button>
            );
          })}
        </div>

        <div className='flex flex-wrap items-center gap-2.5'>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as AdminRequestsTipoFilter)}
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

          <input
            type='search'
            value={nombreQuery}
            onChange={(e) => setNombreQuery(e.target.value)}
            placeholder='Buscar por nombre de empleado…'
            aria-label='Buscar por nombre de empleado'
            className='w-64 px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground placeholder:text-muted appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40'
          />
        </div>
      </div>

      <RequestsTable
        requests={requests}
        isLoading={isLoading}
        error={error}
        actioningId={actioningId}
        onApprove={approve}
        onDeny={deny}
      />

      {!isLoading && !error && totalCount > 0 && (
        <div className='flex items-center justify-between mt-4 text-sm text-muted'>
          <span>
            {totalCount} solicitud{totalCount === 1 ? '' : 'es'}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </AppShell>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async () => {
    return { props: {} };
  },
  { roles: ['Administrador'] },
);

export default AdminRequestsPage;
