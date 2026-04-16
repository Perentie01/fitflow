import { useEffect, useRef } from 'react'
import { saveSnapshot, restoreSnapshot } from '../lib/sync'
import { useAuth } from '../context/AuthContext'

export function useSync(onRestored?: () => void) {
  const { user } = useAuth()
  const hasRestored = useRef(false)

  // Restore once on login
  useEffect(() => {
    if (!user || hasRestored.current) return
    hasRestored.current = true
    restoreSnapshot(user.id).then(restored => {
      if (restored) onRestored?.()
    })
  }, [user])

  // Save on tab hide and every 60s
  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveSnapshot(user.id)
      }
    }

    const interval = setInterval(() => saveSnapshot(user.id), 60_000)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])
}
