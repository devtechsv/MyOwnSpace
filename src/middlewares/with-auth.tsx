/* Wrapper for getServerSideProps to verify the session before rendering */
import API from '@/services/api-services';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { UserRole } from '@/contracts/interfaces/user';
import { Session } from '@/contracts/interfaces/auth';

type WithAuthOptions = {
  public?: boolean;
  // Si se indica, solo estos roles pueden ver la página — cualquier
  // otro rol recibe un 404 genérico (nunca un mensaje que confirme
  // "existe pero no tenés acceso", por la regla de seguridad de
  // OwnSpace.md).
  roles?: UserRole[];
};

// Agrega `session` al `props` de lo que devuelva `fn`, para que
// cualquier página envuelta por withAuth llegue al cliente con la
// sesión ya resuelta (useSession la lee desde ahí vía _app.tsx), sin
// que cada página tenga que acordarse de pasarla a mano.
function withSessionProp<P extends { [key: string]: any }>(
  result: GetServerSidePropsResult<P>,
  session: Session | null,
): GetServerSidePropsResult<P & { session: Session | null }> {
  if ('props' in result) {
    return {
      ...result,
      props: { ...(result.props as P), session },
    };
  }
  return result;
}

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
  ): Promise<GetServerSidePropsResult<P & { session: Session | null }>> => {
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
      const pageResult = await fn(ctx, { user, tokens });
      return withSessionProp(pageResult, user);
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

    const pageResult = await fn(ctx, { user: result.session, tokens });
    return withSessionProp(pageResult, result.session);
  };
}
