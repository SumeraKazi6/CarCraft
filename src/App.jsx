
import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeCheck, CalendarCheck2, Gauge, Sparkles, Star, Trophy, Users } from 'lucide-react'
import Hero from './Hero.jsx'
import Inventory from './Inventory.jsx'
import VehicleDialog from './VehicleDialog.jsx'
import { getVehicles, purchaseVehicle } from './api.js'

const pricingTiers = [
  {
    name: 'Signature Access',
    price: '₹1,500',
    description: 'For clients who want a refined first look at our newest arrivals.',
    features: ['Private inventory preview', 'Concierge shortlist', 'VIP test-drive scheduling'],
    accent: 'border-blue-500/30 bg-blue-500/5',
    featured: false,
  },
  {
    name: 'Grand Touring',
    price: '₹3,900',
    description: 'Our most requested route for premium buyers and moving executives.',
    features: ['Tailored acquisition plan', 'Trade-in advisory', 'Priority dealership access'],
    accent: 'border-cyan-400/30 bg-cyan-500/5',
    featured: true,
  },
  {
    name: 'Private Client',
    price: '₹8,500',
    description: 'A fully bespoke retail experience for discerning automotive collectors.',
    features: ['Vehicle sourcing', 'Negotiation support', 'White-glove delivery'],
    accent: 'border-violet-500/30 bg-violet-500/5',
    featured: false,
  },
]

const aboutHighlights = [
  'Curated inventory from premium performance, luxury, and family segments.',
  'Human-first guidance from specialists who understand buying journeys.',
  'Transparent pricing, financing strategy, and after-sales care from day one.',
]

const processSteps = [
  { title: 'Private consult', description: 'Share your goals, budget, and ideal vehicle profile.', icon: Users },
  { title: 'Curated shortlist', description: 'We surface the vehicles that match your lifestyle and taste.', icon: BadgeCheck },
  { title: 'White-glove delivery', description: 'Finalize pricing, financing, and secure your handover.', icon: CalendarCheck2 },
]

export default function App() {
  const [vehicles, setVehicles] = useState([])
  const [status, setStatus] = useState('loading')
  const [selId, setSelId] = useState(null)
  const [toast, setToast] = useState('')

  const load = () => {
    setStatus('loading')

    getVehicles()
      .then((data) => {
        setVehicles(data)
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
      })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!toast) return

    const timer = setTimeout(() => setToast(''), 3200)

    return () => clearTimeout(timer)
  }, [toast])

  const buy = async (vehicle) => {
    if (!vehicle || vehicle.stock <= 0) return

    try {
      await purchaseVehicle(vehicle.id)

      setVehicles((all) =>
        all.map((item) =>
          item.id === vehicle.id
            ? { ...item, stock: Math.max(item.stock - 1, 0) }
            : item
        )
      )

      setToast(`Purchase confirmed for ${vehicle.make} ${vehicle.model}.`)
    } catch (error) {
      setToast(error.message || 'Unable to complete the purchase.')
    }
  }

  const stats = useMemo(
    () => [
      { label: 'Boutique inventory', value: `${vehicles.length || 0}+` },
      { label: 'Client retention', value: '96%' },
      { label: 'Avg. response', value: '< 30 min' },
      { label: 'Concierge rating', value: '4.9/5' },
    ],
    [vehicles]
  )

  return (
    <>
      <Hero />

      <Inventory
        vehicles={vehicles}
        status={status}
        onRetry={load}
        onOpen={setSelId}
      />

      <main className="mx-auto max-w-[1400px] space-y-8 px-5 pb-14 pt-4 md:px-16">
        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-200">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-blue-300">Luxury standard</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Crafted for clients who expect more.</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[26px] border border-slate-800 bg-[#0b1220] p-5">
                <div className="text-3xl font-semibold tracking-[-0.05em] text-white">{stat.value}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-[32px] p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.24em] text-blue-300">About us</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">A dealership experience built around confidence.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              CarCraft brings together a designer’s eye for luxury with a buyer’s need for clarity, speed, and trust. We shape every interaction around exceptional service, informed guidance, and a premium collection of cars built to move your life forward.
            </p>

            <div className="mt-6 space-y-3">
              {aboutHighlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0b1220]/80 p-4">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-300">
                    <BadgeCheck size={14} />
                  </div>
                  <div className="text-sm leading-6 text-slate-200">{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[32px] p-6 sm:p-8">
            <p className="text-[10px] uppercase tracking-[0.24em] text-blue-300">Our promise</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">From discovery to delivery, every step is effortless.</h3>

            <div className="mt-6 space-y-4">
              {processSteps.map(({ title, description, icon: Icon }, index) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-800 bg-[#0b1220]/80 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-200">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <span>0{index + 1}</span>
                    </div>
                    <div className="text-lg font-semibold text-white">{title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">{description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[32px] p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-blue-300">Pricing</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">Private membership tiers</h2>
            </div>
            <p className="text-sm text-slate-300">Luxury experiences designed around your pace and priorities.</p>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-[28px] border p-6 ${tier.accent} ${tier.featured ? 'ring-1 ring-cyan-300/40 shadow-[0_25px_60px_rgba(34,211,238,0.14)]' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200">{tier.name}</p>
                    <div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white">{tier.price}</div>
                  </div>
                  {tier.featured && (
                    <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                      Popular
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">{tier.description}</p>

                <ul className="mt-5 space-y-3 text-sm text-slate-200">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 text-blue-300"><BadgeCheck size={15} /></span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button type="button" className="luxury-button mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white">
                  Select plan
                </button>
              </article>
            ))}
          </div>
        </section>

      </main>

      <footer className="border-t border-slate-800 px-5 py-8 text-[13px] text-slate-400 md:px-16">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={15} className="text-blue-300" />
            <span className="tracking-[0.22em] text-xs uppercase">CarCraft</span>
          </div>
          <div>Luxury automotive experiences, designed for the next chapter.</div>
        </div>
      </footer>

      <VehicleDialog
        vehicle={vehicles.find((vehicle) => vehicle.id === selId)}
        onClose={() => setSelId(null)}
        onBuy={buy}
      />

      <div
        role="status"
        className={`fixed bottom-5 left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-[#eef2f7] px-4 py-3 text-sm text-slate-900 transition-opacity ${
          toast ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {toast}
      </div>
    </>
  )
}
