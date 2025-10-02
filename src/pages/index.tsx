import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) router.push('/dashboard');
      else router.push('/login');
    }
  }, [user, loading, router]);

  return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
}