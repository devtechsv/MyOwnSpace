import { ReactNode } from 'react';
import { Topbar } from './Topbar';

interface Props {
  children: ReactNode;
  sidebar: ReactNode;
}

export function AppShell({ children, sidebar }: Props) {
  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <Topbar />
      <div className='flex-1 flex min-h-0'>
        <aside className='w-60 shrink-0 bg-surface border-r border-border p-4'>
          {sidebar}
        </aside>
        <main className='flex-1 p-8 md:p-10 overflow-y-auto'>{children}</main>
      </div>
    </div>
  );
}