import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = 'owner' | 'manager' | 'producer' | 'reviewer'

export const getProfile = async (): Promise<Profile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getProfile:', error)
    return null
  }
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password
  })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const isOwnerManager = (profile: Profile | null): boolean => {
  return profile?.role === 'owner' || profile?.role === 'manager'
}

export const isProducer = (profile: Profile | null): boolean => {
  return profile?.role === 'producer'
}

export const isReviewer = (profile: Profile | null): boolean => {
  return profile?.role === 'reviewer'
}

export const canAccessAccountabilityReviews = (profile: Profile | null): boolean => {
  return profile?.role === 'reviewer' || profile?.role === 'manager' || profile?.role === 'owner'
}

export const getRedirectPath = (profile: Profile | null): string => {
  if (!profile) return '/login'
  
  if (isOwnerManager(profile)) {
    return '/team'
  } else if (isReviewer(profile)) {
    return '/accountability'
  } else {
    return '/home'
  }
}