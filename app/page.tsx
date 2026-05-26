import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) {
    const role = (session.user as { role: string }).role
    redirect(role === 'admin' ? '/admin/dashboard' : '/dashboard')
  }
  redirect('/login')
}
