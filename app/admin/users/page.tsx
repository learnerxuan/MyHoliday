import { createSupabaseServerClient } from '@/lib/supabase/server'
import UserList from './UserList'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient()

  const { data: profiles, error } = await supabase
    .from('traveller_profiles')
    .select('*')
  if (error) console.error('Error fetching traveller profiles:', error?.message || error)

  return (
    <main className="min-h-screen bg-warmwhite">
      <UserList profiles={profiles || []} />
    </main>
  )
}
