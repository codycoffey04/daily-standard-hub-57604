import { supabaseAdmin } from '../lib/supabaseAdmin'

const users = [
  { email: 'coffeyagency@allstate.com', displayName: 'Cody Coffey', role: 'owner' as const },
  { email: 'crystalbrozio@allstate.com', displayName: 'Crystal Brozio', role: 'manager' as const },
  { email: 'kfletcher2@allstate.com', displayName: 'Kimberly', role: 'producer' as const },
  { email: 'mrochaguzman@allstate.com', displayName: 'Maria', role: 'producer' as const },
  { email: 'bwilkins2@allstate.com', displayName: 'Brandy', role: 'producer' as const },
  { email: 'calebfill@allstate.com', displayName: 'Caleb', role: 'producer' as const }
]

async function seedUsers() {
  console.log('🌱 Starting user seeding process...')
  
  for (const user of users) {
    try {
      // Use fixed password for all users
      const password = 'Standard2025!'
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true // Skip email verification
      })

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message)
        continue
      }

      if (!authData.user) {
        console.error(`❌ No user data returned for ${user.email}`)
        continue
      }

      console.log(`✅ Created auth user: ${user.email}`)

      // For producers, get producer_id by matching email
      let producerId = null
      if (user.role === 'producer') {
        const { data: producerData } = await supabaseAdmin
          .from('producers')
          .select('id')
          .eq('email', user.email)
          .single()
        
        producerId = producerData?.id || null
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: user.email,
          display_name: user.displayName,
          role: user.role,
          producer_id: producerId
        })

      if (profileError) {
        console.error(`❌ Error creating profile for ${user.email}:`, profileError.message)
        continue
      }

      console.log(`✅ Created profile: ${user.displayName} (${user.role})`)
      
    } catch (error) {
      console.error(`❌ Unexpected error for ${user.email}:`, error)
    }
  }
  
  console.log('🎉 User seeding completed!')
}

// Run the seeder
seedUsers().catch(console.error)