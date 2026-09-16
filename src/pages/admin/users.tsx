import { useState } from 'react';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/common/Button';
import { UsersTable } from '@/components/pages/admin/UsersTable';
import { CreateUserModal } from '@/components/pages/admin/CreateUserModal';
import { EditUserModal } from '@/components/pages/admin/EditUserModal';
import { useAdminUsers } from '@/components/pages/admin/useAdminUsers';
import { useSession } from '@/hooks/useSession';
import { ResetPasswordConfirmModal } from '@/components/common/ResetPasswordConfirmModal';
import { ToggleStatusConfirmModal } from '@/components/common/ToggleStatusConfirmModal';
import { User } from '@/contracts/interfaces/user';

interface Props {}

const AdminUsersPage: NextPage<Props> = () => {
  const session = useSession();
  const { users, stats, isLoading, error, reload } = useAdminUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [togglingUser, setTogglingUser] = useState<User | null>(null);

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='flex items-start justify-between mb-6'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>Usuarios</h1>
          <p className='text-sm text-muted mt-1'>
            Administrá las cuentas del equipo de DevTech.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>Crear usuario</Button>
      </div>

      <div className='grid grid-cols-3 gap-3 mb-5'>
        <div className='p-4 rounded-xl border border-border bg-surface'>
          <div className='text-xs font-semibold text-muted uppercase tracking-wide mb-1'>
            Total usuarios
          </div>
          <div className='text-2xl font-bold text-foreground'>
            {stats.total}
          </div>
        </div>
        <div className='p-4 rounded-xl border border-border bg-surface'>
          <div className='text-xs font-semibold text-muted uppercase tracking-wide mb-1'>
            Activos
          </div>
          <div className='text-2xl font-bold text-emerald-500'>
            {stats.activos}
          </div>
        </div>
        <div className='p-4 rounded-xl border border-border bg-surface'>
          <div className='text-xs font-semibold text-muted uppercase tracking-wide mb-1'>
            Pendientes
          </div>
          <div className='text-2xl font-bold text-amber-500'>
            {stats.pendientes}
          </div>
        </div>
      </div>

      <UsersTable
        users={users}
        isLoading={isLoading}
        error={error}
        currentUserId={session?.userId}
        onEdit={setEditingUser}
        onResetPassword={setResettingUser}
        onToggleStatus={setTogglingUser}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={reload}
      />

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={reload}
        />
      )}

      {resettingUser && (
        <ResetPasswordConfirmModal
          isOpen
          onClose={() => setResettingUser(null)}
          userId={resettingUser.id}
          userName={resettingUser.nombre}
          userEmail={resettingUser.correo}
          onSuccess={reload}
        />
      )}

      {togglingUser && (
        <ToggleStatusConfirmModal
          user={togglingUser}
          onClose={() => setTogglingUser(null)}
          onSuccess={reload}
        />
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

export default AdminUsersPage;
