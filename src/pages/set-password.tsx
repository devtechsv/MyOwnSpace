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

// A diferencia de login/forgot-password, esta página nunca redirige a
// un visitante ya autenticado: el link de "olvidé mi contraseña" llega
// por correo y su token no tiene nada que ver con la sesión que el
// navegador tenga en este momento — redirigir antes de que el usuario
// llegue a usarlo le hace perder el token en silencio (bug real
// encontrado en la auditoría: alguien con sesión activa en otra pestaña
// que abre el link nunca llegaba a ver el formulario).
export const getServerSideProps: GetServerSideProps = withAuth(
  async () => {
    return {
      props: {},
    };
  },
  { public: true },
);

export default SetPassword;
