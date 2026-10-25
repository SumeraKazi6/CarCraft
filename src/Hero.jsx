
import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentCustomer, logoutCustomer } from './api.js'

export default function Hero() {
  const video = useRef(null)
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [checkingLogin, setCheckingLogin] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  // Check whether the customer already has a valid login session.
  useEffect(() => {
    let active = true

    getCurrentCustomer()
      .then((loggedInCustomer) => {
        if (active) {
          setCustomer(loggedInCustomer)
        }
      })
      .catch(() => {
        if (active) {
          setCustomer(null)
        }
      })
      .finally(() => {
        if (active) {
          setCheckingLogin(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Add a subtle 3D movement effect to the background video.
  const onMove = (event) => {
    const element = video.current

    if (!element) return

    element.style.setProperty(
      '--hy',
      (event.clientX / window.innerWidth - 0.5) * 5 + 'deg'
    )

    element.style.setProperty(
      '--hx',
      -(event.clientY / window.innerHeight - 0.5) * 4 + 'deg'
    )
  }

  // Destroy the server-side login session.
  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await logoutCustomer()
      setCustomer(null)
      navigate('/login', { replace: true })
    } catch (error) {
      alert(error.message || 'Unable to log out. Please try again.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header
      id="top"
      onPointerMove={onMove}
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#050b12] bg-cover bg-center [perspective:1100px]"
    >
      {!videoFailed ? (
        <video
          ref={video}
          autoPlay
          muted
          loop
          playsInline
          poster="/poster.jpg"
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-[50%_60%] transition-transform duration-500 [transform:scale(1.08)_rotateX(var(--hx,0deg))_rotateY(var(--hy,0deg))] motion-reduce:hidden"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.22),transparent_25%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,0.18),transparent_20%),linear-gradient(135deg,#020817_0%,#0f172a_42%,#111827_100%)]">
          <div className="mesh-grid absolute inset-0 opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#020817] via-[#020817]/70 to-transparent" />
          <div className="luxury-orb absolute -right-12 top-14 h-60 w-60 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="luxury-orb absolute left-10 bottom-12 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="car-silhouette opacity-80" aria-hidden="true" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.23),_transparent_28%),linear-gradient(90deg,_rgba(3,7,18,0.82)_0%,_rgba(3,7,18,0.50)_35%,_rgba(3,7,18,0.86)_100%)]" />

      <nav className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-16">
        <a
          href="#top"
          className="justify-self-start text-xs uppercase tracking-[.28em] text-white transition-colors hover:text-blue-200 sm:text-sm"
        >
          CarCraft
        </a>

        <div className="justify-self-center">
          {!checkingLogin && customer && (
            <span className="whitespace-nowrap text-xs font-medium text-slate-100 sm:text-sm">
              Hi, {customer.fullName.split(' ')[0]}
            </span>
          )}
        </div>

        <div className="flex items-center justify-self-end gap-2 sm:gap-3">
          <a
            href="#inventory"
            className="rounded-full border border-white/20 bg-white/5 px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-slate-100 backdrop-blur-md transition-colors hover:border-blue-300/70 hover:bg-blue-500/10 hover:text-blue-100 sm:px-4 sm:text-[12px]"
          >
            Inventory
          </a>

          {!checkingLogin && (
            customer ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-white/30 bg-black/20 px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-white backdrop-blur-md transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-60 sm:px-4 sm:text-[12px]"
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-blue-300/30 bg-blue-500/10 px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-blue-100 backdrop-blur-md transition-colors hover:border-blue-200/70 hover:bg-blue-500/15 sm:px-4 sm:text-[12px]"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-full bg-gradient-to-r from-white to-blue-100 px-2.5 py-2 text-[9px] uppercase tracking-[0.16em] text-slate-900 shadow-[0_12px_30px_rgba(96,165,250,0.32)] transition-all hover:shadow-[0_14px_34px_rgba(96,165,250,0.4)] sm:px-4 sm:text-[12px]"
                >
                  Register
                </Link>
              </>
            )
          )}
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl px-5 pb-10 md:px-16 md:pb-20 [&>*]:motion-safe:animate-[up_.9s_ease-out_backwards]">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-blue-200">
          Digital showroom
        </div>

        <h1 className="mb-4 max-w-3xl text-[clamp(38px,7vw,86px)] font-light leading-[0.98] tracking-[-0.06em] text-white [animation-delay:.2s]">
          Every car, crafted for the next chapter.
        </h1>

        <p className="mb-8 max-w-[46ch] text-base leading-7 text-slate-200 [animation-delay:.4s]">
          Curated performance, luxury details, and digital-first buying experiences for premium automotive retail.
        </p>

        <div className="flex flex-wrap items-center gap-4 [animation-delay:.6s]">
          <a
            href="#inventory"
            className="luxury-button inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.18em] text-white shadow-[0_18px_30px_rgba(59,130,246,0.25)]"
          >
            Explore cars
          </a>

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm uppercase tracking-[0.18em] text-white backdrop-blur-md transition-colors hover:border-blue-300/70 hover:bg-blue-500/10 hover:text-blue-100"
          >
            Executive view
          </Link>
        </div>
      </div>
    </header>
  )
}
