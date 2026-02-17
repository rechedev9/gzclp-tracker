import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';

export default function App(): React.ReactNode {
  return (
    <Suspense>
      <AppShell />
    </Suspense>
  );
}
