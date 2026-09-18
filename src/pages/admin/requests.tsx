import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { RequestsTable } from '@/components/pages/admin/RequestsTable';
import {
  AdminRequestsFilter,
  useAdminRequests,
} from '@/components/pages/admin/useAdminRequests';

interface Props {}

const TABS: { key: AdminRequestsFilter; label: string }[] = [
  { key: 'Pendiente', label: 'Pendientes' },
  { key: 'Aprobada', label: 'Aprobadas' },
  { key: 'Denegada', label: 'Denegadas' },
  { key: 'Todas', label: 'Todas' },
];

const AdminRequestsPage: NextPage<Props> = () => {
  const { requests, isLoading, error, actioningId, approve, deny, filtro, setFiltro } =
    useAdminRequests();

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

      <div className='flex gap-2 mb-5'>
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
              {isActive && !isLoading ? ` · ${requests.length}` : ''}
            </button>
          );
        })}
      </div>

      <RequestsTable
        requests={requests}
        isLoading={isLoading}
        error={error}
        actioningId={actioningId}
        onApprove={approve}
        onDeny={deny}
      />
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
