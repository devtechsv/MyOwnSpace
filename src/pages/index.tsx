import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { RequestsTable } from '@/components/pages/employee/RequestsTable';
import { useEmployeeRequests } from '@/components/pages/employee/useEmployeeRequests';

interface Props {}

const Home: NextPage<Props> = () => {
  const { requests, isLoading, error } = useEmployeeRequests();

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className='mb-6'>
        <h1 className='text-xl font-bold text-foreground'>Mis solicitudes</h1>
        <p className='text-sm text-muted mt-1'>
          Consultá el estado de tus permisos y solicitudes.
        </p>
      </div>

      <RequestsTable requests={requests} isLoading={isLoading} error={error} />
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
