import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getProfile, type Profile } from '@/lib/auth'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    try {
      const newProfile = await getProfile()
      setProfile(newProfile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only synchronous state updates here
        setSession(session)
        setUser(session?.user || null)
        
        if (session?.user) {
          // Defer the profile fetch to avoid deadlock
          setTimeout(() => {
            refreshProfile()
          }, 0)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user || null)
        
        if (session?.user) {
          await refreshProfile()
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error getting initial session:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signOut: handleSignOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}