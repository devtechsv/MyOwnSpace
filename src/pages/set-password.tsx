import SetPasswordForm from '@/components/pages/set-password/SetPasswordForm';
import { withAuth } from '@/middlewares/with-auth';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';

interface Props {}

const SetPassword: NextPage<Props> = () => {
  return (
    <>
      <Head>
        <title>Definir contraseña — MyOwnSpace</title>
      </Head>
      <SetPasswordForm />
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

export default SetPassword;
