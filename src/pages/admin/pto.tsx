import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PtoTeamTable } from '@/components/pages/admin/PtoTeamTable';
import { useAdminPto } from '@/components/pages/admin/useAdminPto';

interface Props {}

const AdminPtoPage: NextPage<Props> = () => {
  const {
    rows,
    totalCount,
    isLoading,
    error,
    nombreQuery,
    setNombreQuery,
    mesFiltro,
    setMesFiltro,
    page,
    totalPages,
    setPage,
  } = useAdminPto();

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>PTO del equipo</h1>
        <p className='text-sm text-muted mt-1'>
          Vista de solo lectura para planificación — estas reservas ya
          están confirmadas, no requieren aprobación.
        </p>
      </div>

      <div className='flex flex-wrap items-center justify-end gap-3 mb-4'>
        <div className='flex items-center gap-2'>
          <input
            type='month'
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            aria-label='Filtrar por mes'
            className='px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40'
          />
          {mesFiltro && (
            <button
              type='button'
              onClick={() => setMesFiltro('')}
              className='text-xs font-semibold text-turquoise-blue-600 hover:text-turquoise-blue-700'
            >
              Ver todos
            </button>
          )}
        </div>
        <input
          type='search'
          value={nombreQuery}
          onChange={(e) => setNombreQuery(e.target.value)}
          placeholder='Buscar por nombre de empleado…'
          aria-label='Buscar por nombre de empleado'
          className='w-64 px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground placeholder:text-muted appearance-none focus:outline-none focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40'
        />
      </div>

      <PtoTeamTable rows={rows} isLoading={isLoading} error={error} />

      {!isLoading && !error && totalCount > 0 && (
        <div className='flex items-center justify-between mt-4 text-sm text-muted'>
          <span>{totalCount} reserva{totalCount === 1 ? '' : 's'}</span>
          {totalPages > 1 && (
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1.5 rounded-full border border-border text-foreground disabled:opacity-40'
              >
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type='button'
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className='px-3 py-1.5 rounded-full border border-border text-foreground disabled:opacity-40'
              >
                Siguiente
              </button>
            </div>
          )}
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

export default AdminPtoPage;
