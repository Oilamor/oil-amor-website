import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth/admin-session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SECURITY: Server-side auth gate — unauthenticated users never receive the admin UI
  const session = await getAdminSession()
  if (!session.isAdmin) {
    redirect('/admin/login')
  }
  
  return <>{children}</>
}
