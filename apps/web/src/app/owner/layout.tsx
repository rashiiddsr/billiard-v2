// ─── apps/web/src/app/owner/layout.tsx ───────────────────────────────────────
'use client';
import DashboardLayout from '@/components/shared/DashboardLayout';
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout allowedRoles={['OWNER']}>{children}</DashboardLayout>;
}
