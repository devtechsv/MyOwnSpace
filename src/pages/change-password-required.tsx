import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '@/middlewares/with-auth';
import { ChangePasswordModal } from '@/components/common/ChangePasswordModal';
import { useSession } from '@/hooks/useSession';
import { getHomeRoute } from '@/helpers/get-home-route';

interface Props {}

const ChangePasswordRequiredPage: NextPage<Props> = () => {
  const router = useRouter();
  const session = useSession();

  return (
    <>
      <Head>
        <title>Cambiar contraseña — MyOwnSpace</title>
      </Head>
      <ChangePasswordModal
        isOpen
        forced
        onClose={() => router.push(session ? getHomeRoute(session.rol) : '/')}
      />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(async (_ctx, { user }) => {
  // Si alguien llega acá sin tener pendiente el cambio (por ejemplo,
  // escribiendo la URL a mano), no tiene sentido forzarlo — se lo manda
  // de vuelta a su home normal.
  if (!user.mustChangePassword) {
    return {
      redirect: {
        destination: getHomeRoute(user.rol),
        permanent: false,
      },
    };
  }

  return { props: {} };
});

export default ChangePasswordRequiredPage;
