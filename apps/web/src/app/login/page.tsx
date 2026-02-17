import { Suspense } from 'react';
import { LoginPage } from '@/components/login-page';

export default function Login(): React.ReactNode {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
