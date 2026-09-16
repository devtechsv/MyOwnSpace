import LoginForm from '@/components/pages/login/LoginForm';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

interface Props {}

const Login: NextPage<Props> = ({}) => {
  return (
    <>
      <Head>
        <title>Iniciar sesión — MyOwnSpace</title>
      </Head>
      <LoginForm />
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

export default Login;
