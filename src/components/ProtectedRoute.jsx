import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentCustomer } from '../api.js'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    getCurrentCustomer()
      .then(() => {
        if (active) setStatus('authenticated')
      })
      .catch(() => {
        if (active) setStatus('unauthenticated')
      })

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A] text-white">
        <p className="text-slate-300">Verifying your CarCraft account...</p>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}
