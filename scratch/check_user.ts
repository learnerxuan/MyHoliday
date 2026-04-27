import { createClient } from '@supabase/supabase-js'

async function checkUser() {
  const supabase = createClient(
    'https://wdpnhtkgozigmphmwmnt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcG5odGtnb3ppZ21waG13bW50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc4MDI4MSwiZXhwIjoyMDg5MzU2MjgxfQ.GU1GgIVIRhIfUoi1CZJ7qW2LsQcdLHhdP3t59aaVlLA'
  )

  const targetEmail = 'farrisplane8@gmail.com'

  // 1. Check auth.users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  const targetUser = users.find(u => u.email === targetEmail)

  if (!targetUser) {
    console.log(`User with email ${targetEmail} not found in auth.users.`)
    return
  }

  console.log('Found user:', {
    id: targetUser.id,
    email: targetUser.email,
    role: targetUser.user_metadata?.role,
    created_at: targetUser.created_at
  })

  // 2. Check tour_guides table
  const { data: guides, error: guideError } = await supabase
    .from('tour_guides')
    .select('*')
    .eq('user_id', targetUser.id)

  if (guideError) {
    console.log('Error querying tour_guides:', guideError.message)
  } else if (guides && guides.length > 0) {
    console.log(`Found ${guides.length} tour guide profiles:`, guides)
  } else {
    console.log('No tour guide profile found for this user_id.')
  }

  // 3. Check traveller_profiles table
  const { data: travellers, error: travError } = await supabase
    .from('traveller_profiles')
    .select('*')
    .eq('user_id', targetUser.id)
    
  if (travError) {
    console.log('Error querying traveller_profiles:', travError.message)
  } else if (travellers && travellers.length > 0) {
    console.log(`Found ${travellers.length} traveller profiles:`, travellers)
  } else {
    console.log('No traveller profile found for this user_id.')
  }
}

checkUser()
