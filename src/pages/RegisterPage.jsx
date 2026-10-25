import { useState } from 'react'
import {
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  CarFront,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { registerCustomer } from '../api.js'

function FeedbackBanner({ type, children }) {
  const isSuccess = type === 'success'

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className={`mb-5 flex items-start gap-3 rounded-xl border p-3.5 text-sm ${
        isSuccess
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={19} className="mt-0.5 shrink-0" />
      )}

      <div>{children}</div>
    </div>
  )
}

function FormField({ id, label, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-950/60 transition-colors focus-within:border-blue-500">
        <Icon size={19} aria-hidden="true" className="ml-4 shrink-0 text-slate-500" />
        {children}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputClass =
    'min-w-0 w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-slate-500'

  function validateForm() {
    const errors = {}

    if (!fullName.trim()) {
      errors.fullName = 'Please enter your full name.'
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.'
    } else if (new TextEncoder().encode(password).length > 72) {
      errors.password = 'Password is too long. Please use a shorter password.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    const errorList = Object.values(errors)

    if (errorList.length > 0) {
      setFeedback({ type: 'error', message: errorList[0] })
      return false
    }

    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await registerCustomer({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      })

      setFeedback({
        type: 'success',
        message: 'Your account was created successfully. You can now log in.',
      })

      navigate('/login', { replace: true })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to create your account. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0F172A] text-white">
      <nav className="relative z-50 flex min-h-20 items-center justify-between border-b border-slate-800 bg-[#0F172A]/95 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <Link to="/" aria-label="CarCraft home" className="flex shrink-0 items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-600/15 text-blue-300">
            <CarFront size={27} />
          </span>

          <span className="text-lg font-bold tracking-[0.16em] sm:text-2xl sm:tracking-[0.2em]">
            CARCRAFT
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs font-medium sm:gap-7 sm:text-sm">
          <Link to="/" className="text-slate-300 transition hover:text-blue-400">Home</Link>
          <Link to="/login" className="text-slate-300 transition hover:text-blue-400">Log in</Link>
          <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-blue-300 sm:px-4">
            Register
          </span>
        </div>
      </nav>

      <div className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-[1800px] grid-cols-1 lg:grid-cols-[56fr_44fr]">
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-blue-700/10 blur-3xl" />

        <section aria-label="CarCraft automotive showcase" className="relative flex min-h-[350px] items-center justify-center overflow-hidden px-4 py-8 sm:min-h-[450px] sm:px-8 lg:min-h-[calc(100vh-80px)] lg:px-6 xl:px-10">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[42%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-3xl sm:h-[450px] sm:w-[450px]" />

          <div className="relative z-10 w-full max-w-5xl">
            <div className="relative">
              <div aria-hidden="true" className="absolute inset-8 rounded-full bg-blue-600/20 blur-3xl" />

              <video autoPlay loop muted playsInline preload="metadata" aria-label="CarCraft car showcase" className="relative z-10 mx-auto aspect-[4/3] w-full scale-105 object-contain drop-shadow-[0_25px_70px_rgba(29,78,216,0.35)] sm:scale-110">
                <source src="/register.mp4" type="video/mp4" />
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="relative z-10 mx-auto mt-4 max-w-2xl text-center sm:mt-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300 sm:text-xs sm:tracking-[0.22em]">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Create Account
              </div>

              <h1 className="text-3xl font-light leading-tight tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                Start your
                <span className="mt-1 block font-semibold text-slate-300">CarCraft journey.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                Register to save your account, track your access, and explore a premium collection of vehicles.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center border-t border-slate-800/70 px-4 py-10 sm:px-8 lg:min-h-[calc(100vh-80px)] lg:border-l lg:border-t-0 lg:px-8 lg:py-8 xl:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/4 h-80 w-80 rounded-full bg-blue-700/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7 xl:p-9">
            <div className="mb-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-600/15 text-blue-300">
                <UserRound size={25} />
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Customer Registration
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create Your Account
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {feedback && <FeedbackBanner type={feedback.type}>{feedback.message}</FeedbackBanner>}

              <FormField id="full-name" label="Full name" icon={UserRound}>
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jane Driver"
                  className={inputClass}
                />
              </FormField>

              <FormField id="email" label="Email address" icon={Mail}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </FormField>

              <FormField id="password" label="Password" icon={LockKeyhole}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-400 transition hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </FormField>

              <FormField id="confirm-password" label="Confirm password" icon={LockKeyhole}>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  className={inputClass}
                />
              </FormField>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
                <ArrowRight size={18} />
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-400 transition hover:text-blue-300">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}