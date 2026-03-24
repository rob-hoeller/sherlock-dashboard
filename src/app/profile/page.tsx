'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-auth'

const supabase = createSupabaseBrowserClient()

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData, error } = await supabase.auth.getUser()
      if (error) {
        setMessage('Failed to fetch user data')
        return
      }
      setUser(userData.user)
      setDisplayName(userData.user?.user_metadata.display_name || '')
    }

    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [router])

  const handleSaveChanges = async () => {
    setMessage('')

    if (newPassword && newPassword !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    let hasError = false

    if (displayName !== user?.user_metadata.display_name) {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
      if (error) {
        setMessage('Failed to update display name')
        hasError = true
      }
    }

    if (newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setMessage('Failed to update password')
        hasError = true
      }
    }

    if (!hasError) {
      setMessage('Profile updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      <form className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6 space-y-6" autoComplete="off">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Email
          </label>
          <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400">
            {user?.email || ''}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoComplete="new-password"
          />
        </div>

        <button
          onClick={handleSaveChanges}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded transition-colors"
        >
          Save Changes
        </button>

        {message && (
          <p className={`text-sm text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  )
}