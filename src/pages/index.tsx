import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';

interface Props {}

const Home: NextPage<Props> = () => {
  return (
    <AppShell sidebar={<Sidebar />}>
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
