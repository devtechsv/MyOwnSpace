import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Pagination } from '@/components/common/Pagination';
import { ACCION_LABELS, AuditTable } from '@/components/pages/admin/AuditTable';
import { AdminAuditAccionFilter, useAdminAudit } from '@/components/pages/admin/useAdminAudit';
import { AuditAction } from '@/contracts/interfaces/audit';

interface Props {}

const ACCION_OPTIONS: { value: AdminAuditAccionFilter; label: string }[] = [
  { value: 'Todas', label: 'Todas las acciones' },
  ...(Object.keys(ACCION_LABELS) as AuditAction[]).map((accion) => ({
    value: accion,
    label: ACCION_LABELS[accion],
  })),
];

const CAMPO =
  'px-3.5 py-2 border border-border rounded-full bg-surface-field text-sm text-foreground appearance-none focus:outline-hidden focus:border-turquoise-blue-400 focus:ring-2 focus:ring-turquoise-blue-400/40';

const AdminAuditPage: NextPage<Props> = () => {
  const {
    entradas,
    totalCount,
    page,
    totalPages,
    setPage,
    isLoading,
    error,
    accionFiltro,
    setAccionFiltro,
    desde,
    setDesde,
    hasta,
    setHasta,
  } = useAdminAudit();

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>Auditoría</h1>
        <p className='text-sm text-muted mt-1'>
          Acciones de los administradores e inicios y cierres de sesión. Solo lectura.
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-2.5 mb-5'>
        <select
          value={accionFiltro}
          onChange={(e) => setAccionFiltro(e.target.value as AdminAuditAccionFilter)}
          aria-label='Filtrar por acción'
          className={CAMPO}
        >
          {ACCION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type='date'
          value={desde}
          max={hasta || undefined}
          onChange={(e) => setDesde(e.target.value)}
          aria-label='Desde'
          className={CAMPO}
        />
        <span className='text-sm text-muted'>a</span>
        <input
          type='date'
          value={hasta}
          min={desde || undefined}
          onChange={(e) => setHasta(e.target.value)}
          aria-label='Hasta'
          className={CAMPO}
        />
      </div>

      <AuditTable entradas={entradas} isLoading={isLoading} error={error} />

      {!isLoading && !error && totalCount > 0 && (
        <div className='flex items-center justify-between mt-4 text-sm text-muted'>
          <span>
            {totalCount} registro{totalCount === 1 ? '' : 's'}
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

export default AdminAuditPage;
