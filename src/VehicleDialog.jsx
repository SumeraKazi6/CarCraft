
import React, { useEffect, useRef } from 'react'
import { money } from './api.js'

export default function VehicleDialog({ vehicle: v, onClose, onBuy }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (v && !dialog.open) dialog.showModal()
    if (!v && dialog.open) dialog.close()
  }, [v])

  const specs = v
    ? [
        ['Price', money(v.price)],
        ['Year', v.year],
        ['Category', v.cat],
        ['Fuel', v.fuel],
        ['Transmission', v.trans],
        [
          'Mileage',
          v.km ? v.km.toLocaleString('en-US') + ' km' : 'New',
        ],
        ['Colour', v.color],
        ['In stock', v.stock],
      ]
    : []

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) =>
        event.target === event.currentTarget && onClose()
      }
      className="max-h-[calc(100svh-2rem)] w-[min(720px,calc(100%-2rem))] overflow-auto rounded-[20px] border border-line bg-panel p-0 text-[#eef2f7] backdrop:bg-black/70 motion-safe:open:animate-[dg_.55s_cubic-bezier(.2,.7,.2,1)]"
    >
      {v && (
        <>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-2xl">
              {v.make} {v.model}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-10 w-10 rounded-full border border-line"
            >
              ✕
            </button>
          </div>

          <div className="px-5 pb-5">
            <div className="grid aspect-[16/10] place-items-center rounded-xl bg-[radial-gradient(120%_90%_at_30%_20%,#27374f,#0b1018_70%)]">
              <b className="text-[56px] font-light text-white/20">
                {v.make[0]}
                {v.model[0]}
              </b>
            </div>

            <dl className="my-5 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3.5">
              {specs.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] uppercase tracking-[.14em] text-muted">
                    {key}
                  </dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              disabled={!v.stock}
              onClick={() => onBuy(v)}
              className="w-full rounded-xl bg-accent py-3.5 disabled:cursor-not-allowed disabled:bg-[#2a3342] disabled:text-muted"
            >
              {v.stock ? 'Purchase' : 'Sold out'}
            </button>

            <p className="mt-2.5 text-xs text-muted">
              Purchase requests are saved to the backend and stock is updated after checkout.
            </p>
          </div>
        </>
      )}
    </dialog>
  )
}
