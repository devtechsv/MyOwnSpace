import ForgotPasswordSent from '@/components/pages/forgot-password/ForgotPasswordSent';
import { withAuth } from '@/middlewares/with-auth';
import { getHomeRoute } from '@/helpers/get-home-route';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

interface Props {}

const ForgotPasswordSentPage: NextPage<Props> = () => {
  return (
    <>
      <Head>
        <title>Revisá tu correo — MyOwnSpace</title>
      </Head>
      <ForgotPasswordSent />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context, session) => {
    if (session.user) {
      return {
        redirect: {
          destination: getHomeRoute(session.user.rol),
          permanent: false,
        },
      };
    }

    return {
      props: {},
    };
  },
  { public: true },
);

export default ForgotPasswordSentPage;
