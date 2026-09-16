import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { SessionContext } from '@/hooks/useSession';
import { Session } from '@/contracts/interfaces/auth';

const inter = Inter({ subsets: ['latin'] });

interface AppPageProps {
  session?: Session | null;
}

export default function App({ Component, pageProps }: AppProps<AppPageProps>) {
  const session = pageProps.session ?? null;

  return (
    <SessionContext.Provider value={session}>
      <main className={`${inter.className}`}>
        <Component {...pageProps} />
      </main>
    </SessionContext.Provider>
  );
}