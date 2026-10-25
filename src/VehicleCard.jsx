
import React, { useEffect, useRef, useState } from 'react'
import { money } from './api.js'

const vehicleImages = {
  Toyota: '/images/cars/toyota-camry.svg',
  Honda: '/images/cars/honda-civic.svg',
  Hyundai: '/images/cars/hyundai-creta.svg',
  Tata: '/images/cars/tata-nexon.svg',
  BMW: '/images/cars/bmw-3-series.svg',
  'Maruti Suzuki': '/images/cars/maruti-swift.svg',
}

const canTilt = () =>
  window.matchMedia('(hover:hover) and (pointer:fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion:reduce)').matches

export default function VehicleCard({ v, i, onOpen }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setSeen(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )

    if (ref.current) observer.observe(ref.current)

    return () => observer.disconnect()
  }, [])

  const move = (event) => {
    if (!canTilt() || !ref.current) return

    const rect = ref.current.getBoundingClientRect()

    setTilt({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    })
  }

  const tag =
    v.stock === 0
      ? ['Sold out', 'text-red-300']
      : v.stock <= 2
        ? [`Only ${v.stock} left`, 'text-amber-200']
        : [`${v.stock} in stock`, '']

  const imageSrc = v.imageUrl || v.image_url || vehicleImages[v.make] || null

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(v.id)}
      onPointerMove={move}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `rotateX(${-tilt.y * 14}deg) rotateY(${tilt.x * 14}deg)`,
        animationDelay: `${(i % 4) * 80}ms`,
      }}
      className={`flex flex-col rounded-2xl border border-line bg-panel p-0 text-left transition-[transform,border-color] duration-200 [transform-style:preserve-3d] hover:border-accent2/50 motion-safe:opacity-0 ${
        seen
          ? 'motion-safe:animate-[rv_.9s_cubic-bezier(.2,.7,.2,1)_backwards] motion-safe:opacity-100'
          : ''
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-[#0b1018]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`${v.make} ${v.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-center text-slate-200">
            <div>
              <div className="text-lg font-semibold tracking-[0.14em]">{v.make ? v.make.slice(0, 2).toUpperCase() : 'CF'}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{v.model || 'Vehicle'}</div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070b]/70 via-transparent to-[#04070b]/10" />

        <span
          className={`absolute right-3 top-3 rounded-full border border-line bg-black/50 px-2.5 py-1 text-[11px] [transform:translateZ(30px)] ${tag[1]}`}
        >
          {tag[0]}
        </span>

        <i className="absolute bottom-2.5 left-3 text-[10px] uppercase not-italic tracking-[.14em] text-white/80">
          Featured
        </i>
      </div>

      <div className="grid gap-1 p-4 [transform:translateZ(22px)]">
        <h3 className="text-[19px]">
          {v.make} {v.model}
        </h3>

        <p className="text-sm text-muted">
          {v.year} · {v.cat} · {v.fuel}
        </p>

        <div className="mt-2 text-xl">{money(v.price)}</div>
      </div>
    </button>
  )
}
