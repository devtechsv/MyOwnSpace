import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';

interface Props {}

const Home: NextPage<Props> = () => {
  return (
    <AppShell
      sidebar={<div className='text-sm text-muted'>Sidebar (Tarea 11)</div>}
    >
      Dashboard
    </AppShell>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context, session) => {
    return {
      props: {},
    };
  },
);

export default Home;
