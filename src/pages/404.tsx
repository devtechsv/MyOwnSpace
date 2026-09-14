import Head from 'next/head';
import NotFoundPage from '@/components/pages/not-found/NotFoundPage';

// Next.js exige que pages/404.tsx sea una página estática (sin
// getServerSideProps), así que no puede pasar por withAuth. Eso está
// bien: es exactamente la página que se muestra tanto para rutas que
// no existen como para rutas que el rol actual no puede ver (ver
// with-auth.tsx) — nunca revela cuál de las dos fue.
const Page404 = () => {
  return (
    <>
      <Head>
        <title>Página no encontrada — MyOwnSpace</title>
      </Head>
      <NotFoundPage />
    </>
  );
};

export default Page404;
