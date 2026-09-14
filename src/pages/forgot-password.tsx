import ForgotPasswordForm from '@/components/pages/forgot-password/ForgotPasswordForm';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

interface Props {}

const ForgotPassword: NextPage<Props> = () => {
  return (
    <>
      <Head>
        <title>Olvidé mi contraseña — MyOwnSpace</title>
      </Head>
      <ForgotPasswordForm />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = withAuth(
  async (context, session) => {
    if (session.user) {
      return {
        redirect: {
          destination: '/',
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

export default ForgotPassword;
