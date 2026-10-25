import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, CarFront, Gauge, Sparkles } from 'lucide-react'
import { getVehicles, money } from '../api.js'

export default function InventoryPage() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true

    getVehicles()
      .then((data) => {
        if (active) {
          setVehicles(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load vehicles.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const filteredVehicles = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return vehicles.filter((vehicle) => {
      if (!normalized) return true

      return [vehicle.make, vehicle.model, String(vehicle.year || '')].join(' ').toLowerCase().includes(normalized)
    })
  }, [vehicles, query])

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <nav className="border-b border-slate-800/80 bg-[#0a111b]/95 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300">
              <CarFront size={22} />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-[0.22em]">CARCRAFT</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-blue-500/60 hover:text-white">Dashboard</Link>
            <Link to="/" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">Home</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-[#0f1724] p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">Vehicle Inventory</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">CarCraft showroom</h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-[#0b1220] px-4 py-3 text-sm text-slate-300 sm:min-w-[280px]">
              <Search size={16} className="text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by make, model, or year"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-[#0f1724] p-8 text-slate-300">Loading inventory…</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-red-300">{error}</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-700 bg-[#0f1724] p-12 text-center text-slate-400">
                No vehicles match the current filter.
              </div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <article key={vehicle.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-[#111b29] shadow-lg shadow-black/20">
                  <div className="flex h-52 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,119,255,0.45),_rgba(15,23,36,0.8))] px-4">
                    {vehicle.imageUrl || vehicle.image_url ? (
                      <img src={vehicle.imageUrl || vehicle.image_url} alt={`${vehicle.make} ${vehicle.model}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Sparkles className="mx-auto mb-3 text-blue-300" />
                        <div className="text-lg font-semibold tracking-[0.12em] text-slate-200">{vehicle.make}</div>
                        <div className="text-sm text-slate-400">{vehicle.model}</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-white">{vehicle.make} {vehicle.model}</h2>
                        <p className="mt-1 text-sm text-slate-400">{vehicle.year || 'N/A'} • {vehicle.cat || vehicle.category || 'Vehicle'}</p>
                      </div>

                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${Number(vehicle.stock || 0) > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                        {Number(vehicle.stock || 0) > 0 ? 'Available' : 'Sold out'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-2"><Gauge size={15} className="text-blue-300" /> {vehicle.km || vehicle.mileage || 0} km</span>
                      <span className="inline-flex items-center gap-2"><CarFront size={15} className="text-blue-300" /> {vehicle.fuel || 'Unknown'}</span>
                    </div>

                    <div className="flex items-end justify-between gap-3 border-t border-slate-800 pt-4">
                      <div>
                        <div className="text-2xl font-semibold text-white">{money(vehicle.price)}</div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Stock: {vehicle.stock || 0}</div>
                      </div>

                      <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
                        View details <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
