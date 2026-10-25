import React, { useMemo, useState } from 'react'
import VehicleCard from './VehicleCard.jsx'

const EMPTY = { q: '', model: '', cat: '', min: '', max: '', sort: '' }
const input = 'w-full rounded-[10px] border border-line bg-panel px-3 py-2.5 focus:outline-2 focus:outline-accent'
const uniq = (list, k) => [...new Set(list.map((v) => v[k]))].sort()

function Field({ label, id, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[11px] uppercase tracking-[.14em] text-muted">{label}</label>
      {children}
    </div>
  )
}

export default function Inventory({ vehicles, status, onRetry, onOpen }) {
  const [f, setF] = useState(EMPTY)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const cats = useMemo(() => uniq(vehicles, 'cat'), [vehicles])
  const models = useMemo(() => uniq(vehicles, 'model'), [vehicles])

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const min = parseFloat(f.min), max = parseFloat(f.max)
    const uniqueVehicles = Array.from(new Map(vehicles.map((v) => [v.id, v])).values())
    const r = uniqueVehicles.filter((v) =>
      (!q || `${v.make} ${v.model}`.toLowerCase().includes(q)) &&
      (!f.model || v.model === f.model) && (!f.cat || v.cat === f.cat) &&
      (isNaN(min) || v.price >= min) && (isNaN(max) || v.price <= max))
    if (f.sort === 'pa') r.sort((a, b) => a.price - b.price)
    if (f.sort === 'pd') r.sort((a, b) => b.price - a.price)
    if (f.sort === 'y') r.sort((a, b) => b.year - a.year)
    return r
  }, [vehicles, f])

  const opts = (list, all) => <><option value="">{all}</option>{list.map((x) => <option key={x}>{x}</option>)}</>
  const box = 'col-span-full rounded-[26px] border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center text-slate-300'

  return (
    <main id="inventory" className="mx-auto max-w-[1360px] px-5 py-14 md:px-16 md:py-24">
      <div className="mb-8 rounded-[30px] border border-slate-800 bg-[linear-gradient(135deg,_rgba(17,27,41,0.98),_rgba(9,14,21,0.92))] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.4)]">
        <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-blue-300">Curated inventory</p>
        <h2 className="mb-2 text-[clamp(28px,4vw,48px)] font-light tracking-[-0.06em] text-white">Explore premium cars</h2>
        <p className="text-slate-300">Live inventory from the CarCraft backend, refined for a luxury dealership experience.</p>
      </div>

      <div role="search" className="glass-panel grid grid-cols-2 gap-2.5 rounded-[28px] p-4 shadow-[0_24px_60px_rgba(2,6,23,0.4)] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <Field label="Search" id="q" className="col-span-full sm:col-span-1"><input id="q" type="search" placeholder="Make or model" value={f.q} onChange={set('q')} className={input} /></Field>
        <Field label="Model" id="md"><select id="md" value={f.model} onChange={set('model')} className={input}>{opts(models, 'All models')}</select></Field>
        <Field label="Category" id="ct"><select id="ct" value={f.cat} onChange={set('cat')} className={input}>{opts(cats, 'All categories')}</select></Field>
        <Field label="Min price" id="mn"><input id="mn" type="number" min="0" step="1000" placeholder="0" value={f.min} onChange={set('min')} className={input} /></Field>
        <Field label="Max price" id="mx"><input id="mx" type="number" min="0" step="1000" placeholder="Any" value={f.max} onChange={set('max')} className={input} /></Field>
        <Field label="Sort" id="so"><select id="so" value={f.sort} onChange={set('sort')} className={input}>
          <option value="">Featured</option><option value="pa">Price: low to high</option><option value="pd">Price: high to low</option><option value="y">Newest</option></select></Field>
      </div>

      <div className="my-4 flex items-center justify-between text-sm text-slate-300">
        <span aria-live="polite">{status === 'ready' ? `${rows.length} ${rows.length === 1 ? 'vehicle' : 'vehicles'}` : status === 'loading' ? 'Loading…' : ''}</span>
        <button type="button" onClick={() => setF(EMPTY)} className="text-blue-300 underline decoration-blue-300/60 underline-offset-4">Reset filters</button>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))] [perspective:1200px]">
        {status === 'loading' && [0, 1, 2].map((i) => <div key={i} className="h-[330px] rounded-[26px] bg-[linear-gradient(90deg,#0e131b,#161e2a,#0e131b)] bg-[length:200%_100%] motion-safe:animate-[sh_1.2s_linear_infinite]" />)}
        {status === 'error' && <div className={box}>Something went wrong loading the inventory.<br /><button type="button" onClick={onRetry} className="mt-3 rounded-full bg-white px-6 py-3 text-sm uppercase tracking-[0.18em] text-slate-900">Try again</button></div>}
        {status === 'ready' && rows.length === 0 && <div className={box}>No vehicles match these filters.<br /><button type="button" onClick={() => setF(EMPTY)} className="mt-3 rounded-full bg-white px-6 py-3 text-sm uppercase tracking-[0.18em] text-slate-900">Clear filters</button></div>}
        {status === 'ready' && rows.map((v, i) => <VehicleCard key={v.id} v={v} i={i} onOpen={() => onOpen(v.id)} />)}
      </div>
    </main>
  )
}
