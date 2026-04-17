import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return (
    <div className="h-dvh flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading...</span>
    </div>
  )

  if (!user) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setSubmitting(true)
      const result = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password)
      setSubmitting(false)
      if (result.error) setError(result.error)
    }

    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-6">
        <h1 className="font-display text-4xl">
          Fit<span className="text-primary">Flow</span>
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    )
  }

  return <>{children}</>
}
