
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, LoaderCircle } from 'lucide-react'
import { logoutCustomer } from '../api.js'

export default function LogoutButton({ className = '' }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setError('')

    try {
      await logoutCustomer()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to log out. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:border-red-400/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {isLoggingOut ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <LogOut size={17} />
        )}

        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
