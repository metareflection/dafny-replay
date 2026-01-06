import { useState } from 'react'
import { signIn, signUp, signInWithGoogle, isSupabaseConfigured } from '../../supabase.js'
import './auth.css'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-form">
        <h2 className="auth-form__title">Configuration Required</h2>
        <p className="auth-form__warning">
          Supabase is not configured. Please copy .env.example to .env and fill in your Supabase credentials.
        </p>
        <p className="auth-form__hint">
          See the README for setup instructions.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('Check your email for confirmation link')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-form">
      <h2 className="auth-form__title">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>

      {error && <div className="auth-form__error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form__form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="auth-form__input"
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="auth-form__input"
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />
        <button type="submit" disabled={loading} className="auth-form__submit">
          {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      <p className="auth-form__toggle">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button onClick={() => setIsSignUp(!isSignUp)} className="auth-form__toggle-btn">
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}
