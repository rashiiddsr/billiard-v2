'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LegacyAttendanceRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'MANAGER') router.replace('/manager/attendance');
    else if (user.role === 'CASHIER') router.replace('/cashier/attendance');
    else router.replace('/login');
  }, [user, loading, router]);

  return null;
}
