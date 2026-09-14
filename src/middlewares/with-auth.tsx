/* Wrapper for getServerSideProps to verify the session before rendering */
import API from '@/services/api-services';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { UserRole } from '@/contracts/interfaces/user';

type WithAuthOptions = {
  public?: boolean;
  // Si se indica, solo estos roles pueden ver la página — cualquier
  // otro rol recibe un 404 genérico (nunca un mensaje que confirme
  // "existe pero no tenés acceso", por la regla de seguridad de
  // OwnSpace.md).
  roles?: UserRole[];
};

// Verifica la sesión antes de renderizar. Sin sesión válida -> /login;
// con sesión vencida por inactividad -> /login?expired=1 (banner
// correspondiente en el login); con sesión válida pero rol no
// autorizado -> 404 genérico.
export function withAuth<P extends { [key: string]: any }>(
  fn: (
    ctx: GetServerSidePropsContext,
    session: any,
  ) => Promise<GetServerSidePropsResult<P>>,
  options?: WithAuthOptions,
) {
  return async (
    ctx: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<P>> => {
    const { req, res } = ctx;
    const { accessToken } = req.cookies;
    const { refreshToken } = req.cookies;

    const result = await API.auth.refreshSession(
      accessToken,
      refreshToken,
      req,
      res,
    );

    const tokens = {
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
    };

    if (options?.public) {
      const user = result.status === 'valid' ? result.session : null;
      return await fn(ctx, { user, tokens });
    }

    if (result.status === 'none') {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    if (result.status === 'expired') {
      return {
        redirect: {
          destination: '/login?expired=1',
          permanent: false,
        },
      };
    }

    if (options?.roles && !options.roles.includes(result.session.rol)) {
      return { notFound: true };
    }

    return await fn(ctx, { user: result.session, tokens });
  };
}
