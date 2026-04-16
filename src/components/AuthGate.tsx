import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth()

  if (loading) return (
    <div className="h-dvh flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading...</span>
    </div>
  )

  if (!user) return (
    <div className="h-dvh flex flex-col items-center justify-center gap-6">
      <h1 className="font-display text-4xl">
        Fit<span className="text-primary">Flow</span>
      </h1>
      <Button onClick={signIn}>Sign in with Google</Button>
    </div>
  )

  return <>{children}</>
}
