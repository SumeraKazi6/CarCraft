
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CarFront,
  CircleDollarSign,
  Gauge,
  HelpCircle,
  Heart,
  LayoutDashboard,
  LogOut,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  createVehicle,
  deleteVehicle,
  getCurrentCustomer,
  getDashboardData,
  getVehicles,
  logoutCustomer,
  money,
  purchaseVehicle,
  updateVehicle,
} from '../api.js'

const navItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    section: 'MAIN',
    active: true,
  },
  {
    label: 'Sign Out',
    icon: LogOut,
    to: '/login',
    section: 'SETTINGS',
    active: false,
  },
]

function StatCard({ icon: Icon, title, value, hint, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
  }

  return (
    <div className="rounded-[26px] border border-slate-800/80 bg-[#111b29]/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}
        >
          <Icon size={20} />
        </div>
      </div>

      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white">
        {value}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {hint}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const [customer, setCustomer] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const vehicleImageMap = {
    Toyota: {
      Camry: '/images/cars/toyota-camry.svg',
    },
    Honda: {
      Civic: '/images/cars/honda-civic.svg',
    },
    Hyundai: {
      Creta: '/images/cars/hyundai-creta.svg',
    },
    Tata: {
      Nexon: '/images/cars/tata-nexon.svg',
    },
    BMW: {
      '3 Series': '/images/cars/bmw-3-series.svg',
    },
    'Maruti Suzuki': {
      Swift: '/images/cars/maruti-swift.svg',
    },
  }

  const getVehicleImageUrl = (make, model) => {
    const normalizedMake = String(make || '').trim()
    const normalizedModel = String(model || '').trim()

    if (!normalizedMake || !normalizedModel) {
      return ''
    }

    return vehicleImageMap[normalizedMake]?.[normalizedModel] || ''
  }

  const [quickVehicle, setQuickVehicle] = useState({
    model: '',
    category: 'SUV',
    price: '',
    stock: '1',
    year: new Date().getFullYear(),
    fuel: 'Petrol',
    transmission: 'Automatic',
    mileage: '0',
    color: 'Silver',
    image_url: '',
  })

  const [formMessage, setFormMessage] = useState('')
  const [submittingVehicle, setSubmittingVehicle] = useState(false)
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const [purchaseLoadingId, setPurchaseLoadingId] = useState(null)
  const [editingVehicleId, setEditingVehicleId] = useState(null)
  const [deletingVehicleId, setDeletingVehicleId] = useState(null)
  const [editForm, setEditForm] = useState({
    price: '',
    stock: '',
    image_url: '',
  })

  const [vehicleFilters, setVehicleFilters] = useState({
    search: '',
    category: 'all',
    maxPrice: 'all',
  })

  const normalizedUserRole = String(customer?.role || '').toLowerCase()

  const isAdmin =
    normalizedUserRole === 'admin' ||
    normalizedUserRole === 'administrator' ||
    String(customer?.email || '').toLowerCase() ===
      'admin@carcraft.com'

  const adminModules = [
    {
      label: 'Inventory',
      value: dashboard?.summary?.totalVehicles ?? 0,
      helper: 'vehicles in portfolio',
      tint: 'from-blue-500/20 to-cyan-500/10',
    },
    {
      label: 'Sales',
      value: dashboard?.sales?.length
        ? dashboard.sales.reduce(
            (sum, row) => sum + Number(row.total || 0),
            0,
          )
        : 0,
      helper: 'booked revenue',
      tint: 'from-emerald-500/20 to-teal-500/10',
    },
    {
      label: 'Customers',
      value:
        dashboard?.activity?.filter(
          (item) => item.type === 'customer',
        ).length ?? 0,
      helper: 'recent registrations',
      tint: 'from-violet-500/20 to-fuchsia-500/10',
    },
    {
      label: 'Insights',
      value: dashboard?.brands?.length ?? 0,
      helper: 'brand active',
      tint: 'from-amber-500/20 to-orange-500/10',
    },
  ]

  const customerModules = [
    {
      label: 'Completed purchases',
      value: dashboard?.customer?.purchaseCount ?? 0,
      helper: 'from your account',
      tint: 'from-blue-500/20 to-cyan-500/10',
    },
    {
      label: 'Total spent',
      value: money(dashboard?.customer?.totalSpend ?? 0),
      helper: 'actual spend',
      tint: 'from-emerald-500/20 to-teal-500/10',
    },
    {
      label: 'Available cars',
      value: dashboard?.summary?.available ?? 0,
      helper: 'currently in stock',
      tint: 'from-violet-500/20 to-fuchsia-500/10',
    },
    {
      label: 'Inventory total',
      value: dashboard?.summary?.totalVehicles ?? 0,
      helper: 'live catalog',
      tint: 'from-amber-500/20 to-orange-500/10',
    },
  ]

  useEffect(() => {
    let active = true

    Promise.all([
      getCurrentCustomer().catch(() => null),
      getDashboardData().catch((err) => ({
        error: err.message || 'Unable to load dashboard data.',
      })),
      getVehicles({ all: true }).catch(() => []),
    ])
      .then(([currentCustomer, dashboardData, vehicleData]) => {
        if (!active) return

        setCustomer(currentCustomer)

        if (dashboardData?.error) {
          setError(dashboardData.error)
        } else if (dashboardData) {
          setDashboard(dashboardData)
        }

        setVehicles(Array.isArray(vehicleData) ? vehicleData : [])
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Unable to load the CarCraft dashboard.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const featuredVehicles = vehicles.slice(0, 4)
  const customerName =
    customer?.fullName || customer?.full_name || 'Customer'

  const filteredVehicles = useMemo(() => {
    const query = vehicleFilters.search.trim().toLowerCase()

    return vehicles.filter((vehicle) => {
      const matchSearch = !query ||
        [
          vehicle.make,
          vehicle.model,
          vehicle.year,
          vehicle.category,
          vehicle.cat,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)

      const categoryMatch =
        vehicleFilters.category === 'all' ||
        (vehicle.category || vehicle.cat || '').toLowerCase() ===
          vehicleFilters.category.toLowerCase()

      const priceMatch =
        vehicleFilters.maxPrice === 'all' ||
        Number(vehicle.price || 0) <=
          Number(vehicleFilters.maxPrice)

      return matchSearch && categoryMatch && priceMatch
    })
  }, [vehicleFilters, vehicles])

  const salesBars = useMemo(() => {
    if (!dashboard?.sales || dashboard.sales.length === 0) {
      return []
    }

    const max = Math.max(
      ...dashboard.sales.map((item) => Number(item.total || 0)),
      1,
    )

    return dashboard.sales.map((item) => ({
      ...item,
      height: `${(Number(item.total || 0) / max) * 100}%`,
    }))
  }, [dashboard])

  const inventoryShares = useMemo(() => {
    if (!dashboard?.summary) return []

    const total = Math.max(
      dashboard.summary.totalVehicles || 1,
      1,
    )
    const available = Math.max(
      dashboard.summary.available || 0,
      0,
    )
    const reserved = Math.max(
      dashboard.summary.reserved || 0,
      0,
    )
    const sold = Math.max(total - available - reserved, 0)

    return [
      { label: 'Available', value: available, color: '#45c89a' },
      { label: 'Reserved', value: reserved, color: '#f5b942' },
      { label: 'Sold', value: sold, color: '#f05a67' },
    ].filter((item) => item.value > 0)
  }, [dashboard])

  const handleLogout = async () => {
    try {
      await logoutCustomer()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  const handlePurchaseVehicle = async (vehicleId) => {
    try {
      setPurchaseLoadingId(vehicleId)
      setPurchaseMessage('')

      await purchaseVehicle(vehicleId)

      const refreshedVehicles = await getVehicles()
      const refreshedDashboard = await getDashboardData()

      setVehicles(
        Array.isArray(refreshedVehicles) ? refreshedVehicles : [],
      )
      setDashboard(refreshedDashboard)
      setPurchaseMessage(
        'Vehicle purchased successfully. Your purchase history has been updated.',
      )
    } catch (error) {
      setPurchaseMessage(
        error.message || 'Unable to complete the purchase.',
      )
    } finally {
      setPurchaseLoadingId(null)
    }
  }

  const handleQuickVehicleSubmit = async (event) => {
    event.preventDefault()

    if (!isAdmin) {
      setFormMessage(
        'Admin access is required to add vehicles to the inventory.',
      )
      return
    }

    setSubmittingVehicle(true)
    setFormMessage('')

    try {
      const normalizedMake =
        (quickVehicle.model || '').trim() || 'CarCraft'

      const imageUrl =
        (quickVehicle.image_url || '').trim() ||
        getVehicleImageUrl(normalizedMake, quickVehicle.model)

      await createVehicle({
        make: normalizedMake,
        model: quickVehicle.model.trim(),
        category: quickVehicle.category,
        price: Number(quickVehicle.price),
        stock: Number(quickVehicle.stock || 0),
        year: Number(quickVehicle.year),
        fuel: quickVehicle.fuel,
        transmission: quickVehicle.transmission,
        mileage: Number(quickVehicle.mileage || 0),
        color: quickVehicle.color,
        image_url: imageUrl,
      })

      const refreshedVehicles = await getVehicles({ all: true })
      setVehicles(refreshedVehicles)
      setFormMessage(
        'Vehicle added successfully to the CarCraft catalog.',
      )

      setQuickVehicle({
        model: '',
        category: 'SUV',
        price: '',
        stock: '1',
        year: new Date().getFullYear(),
        fuel: 'Petrol',
        transmission: 'Automatic',
        mileage: '0',
        color: 'Silver',
        image_url: '',
      })
    } catch (error) {
      setFormMessage(error.message || 'Unable to add the vehicle.')
    } finally {
      setSubmittingVehicle(false)
    }
  }

  const handleEditVehicle = (vehicle) => {
    setEditingVehicleId(vehicle.id ?? vehicle.vehicle_id)

    setEditForm({
      price: String(vehicle.price ?? ''),
      stock: String(vehicle.stock ?? 0),
      image_url: String(
        vehicle.image_url || vehicle.imageUrl || '',
      ),
    })
  }

  const handleUpdateVehicle = async (vehicleId) => {
    if (!isAdmin) {
      setFormMessage('Only administrators can update vehicles.')
      return
    }

    try {
      await updateVehicle(vehicleId, {
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        image_url: editForm.image_url,
      })

      const refreshedVehicles = await getVehicles({ all: true })
      setVehicles(refreshedVehicles)
      setEditingVehicleId(null)
      setEditForm({
        price: '',
        stock: '',
        image_url: '',
      })
      setFormMessage('Vehicle details updated successfully.')
    } catch (error) {
      setFormMessage(
        error.message || 'Unable to update the vehicle.',
      )
    }
  }

  // Delete the selected vehicle only after the backend confirms success.
  const handleDeleteVehicle = async (vehicleId) => {
    if (!isAdmin) {
      setFormMessage('Only administrators can delete vehicles.')
      return
    }

    if (
      vehicleId === undefined ||
      vehicleId === null ||
      vehicleId === ''
    ) {
      setFormMessage(
        'Cannot delete this vehicle because its ID is missing.',
      )
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this vehicle from the inventory?',
    )

    if (!confirmed) return

    try {
      setDeletingVehicleId(vehicleId)
      setFormMessage('')

      await deleteVehicle(vehicleId)

      // Remove the vehicle from React state immediately upon successful deletion
      setVehicles((prev) =>
        prev.filter((v) => {
          const currentId = v.id ?? v.vehicle_id
          return String(currentId) !== String(vehicleId)
        }),
      )

      // Update dashboard statistics in React state immediately
      setDashboard((prev) => {
        if (!prev?.summary) return prev
        const targetVehicle = vehicles.find((v) => {
          const currentId = v.id ?? v.vehicle_id
          return String(currentId) === String(vehicleId)
        })
        const hasStock = Number(targetVehicle?.stock || 0) > 0

        return {
          ...prev,
          summary: {
            ...prev.summary,
            totalVehicles: Math.max(0, (prev.summary.totalVehicles || 0) - 1),
            available: hasStock
              ? Math.max(0, (prev.summary.available || 0) - 1)
              : (prev.summary.available || 0),
          },
        }
      })

      if (
        String(editingVehicleId) === String(vehicleId)
      ) {
        setEditingVehicleId(null)
        setEditForm({
          price: '',
          stock: '',
          image_url: '',
        })
      }

      setFormMessage('Vehicle deleted successfully.')

      // Refresh inventory data without allowing an unrelated
      // dashboard-refresh failure to incorrectly report that deletion failed
      try {
        const [refreshedVehicles, refreshedDashboard] =
          await Promise.allSettled([
            getVehicles({ all: true }),
            getDashboardData(),
          ])

        if (
          refreshedVehicles.status === 'fulfilled' &&
          Array.isArray(refreshedVehicles.value)
        ) {
          setVehicles(refreshedVehicles.value)
        }

        if (
          refreshedDashboard.status === 'fulfilled' &&
          refreshedDashboard.value &&
          !refreshedDashboard.value.error
        ) {
          setDashboard(refreshedDashboard.value)
        }
      } catch (refreshError) {
        console.warn('Dashboard background refresh failed:', refreshError)
      }
    } catch (error) {
      console.error('Vehicle deletion failed:', error)

      setFormMessage(
        error.message ||
          'Unable to delete the vehicle. Check the server/API and try again.',
      )
    } finally {
      setDeletingVehicleId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-[#0a111b]/95 lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-6 lg:px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/25 to-cyan-400/20 text-blue-200">
              <CarFront size={22} />
            </div>

            <div>
              <div className="text-base font-semibold tracking-[0.28em] text-slate-100">
                CARCRAFT
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Executive Suite
              </p>
            </div>
          </div>

          <nav className="space-y-6 px-4 py-5">
            {['MAIN', 'SETTINGS'].map((sectionName) => {
              const visibleItems = navItems.filter((item) => {
                if (item.section !== sectionName) return false

                if (!isAdmin) {
                  return ['Dashboard', 'Sign Out'].includes(
                    item.label,
                  )
                }

                return true
              })

              return (
                <div key={sectionName}>
                  <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {sectionName}
                  </p>

                  <div className="space-y-1.5">
                    {visibleItems.map(
                      ({ label, icon: Icon, to }) => (
                        <Link
                          key={label}
                          to={to}
                          onClick={(event) => {
                            if (label === 'Sign Out') {
                              event.preventDefault()
                              handleLogout()
                            }
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                            label === 'Dashboard'
                              ? 'bg-gradient-to-r from-blue-600/15 to-cyan-500/10 text-blue-200 ring-1 ring-blue-500/30'
                              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{label}</span>
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 bg-[#070b12]">
          <header className="border-b border-slate-800/80 bg-[#0b1220]/80 px-5 py-5 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#111b29] px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.25)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-cyan-300/10 text-sm font-semibold text-blue-200">
                  {customerName.charAt(0).toUpperCase()}
                </div>

                <div className="text-left">
                  <div className="text-sm font-medium text-white">
                    {customerName}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    {customer?.role || 'Customer'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-8 px-5 py-8 sm:px-8 lg:px-10">
            <section className="overflow-hidden rounded-[30px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.15),_transparent_35%),linear-gradient(135deg,_rgba(17,27,41,1),_rgba(9,14,21,1))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.38)] lg:p-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-blue-200">
                    <Sparkles size={12} />
                    {isAdmin
                      ? 'Luxury inventory intelligence'
                      : 'Your personal showroom'}
                  </div>

                  <h1 className="text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                    Welcome back, {customerName}.
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                    {isAdmin
                      ? 'Monitor premium inventory, track showroom demand, and steer the next wave of automotive performance across your CarCraft portfolio.'
                      : 'Browse premium cars, keep your shortlist close, and manage the buying journey with the features built for everyday customers.'}
                  </p>
                </div>
              </div>
            </section>

            {loading ? (
              <div className="rounded-[28px] border border-slate-800 bg-[#101a27] p-8 text-slate-300">
                Loading CarCraft dashboard…
              </div>
            ) : error ? (
              <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-8 text-red-300">
                {error}
              </div>
            ) : isAdmin ? (
              <>
                <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
                  {adminModules.map((module) => (
                    <div
                      key={module.label}
                      className={`rounded-[26px] border border-slate-800 bg-gradient-to-br ${module.tint} p-5 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-300">
                        {module.label}
                      </p>
                      <p className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-white">
                        {module.value}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                        {module.helper}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                          Dealer operations
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                          Executive command center
                        </h2>
                      </div>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220]">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="bg-slate-950/80 text-slate-400">
                            <tr>
                              <th className="px-4 py-3 font-medium">
                                Vehicle
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Price
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Stock
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Image
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {vehicles.map((vehicle) => {
                              const vehicleId =
                                vehicle.id ?? vehicle.vehicle_id
                              const isDeleting =
                                deletingVehicleId !== null &&
                                String(deletingVehicleId) ===
                                  String(vehicleId)

                              return (
                                <tr
                                  key={vehicleId}
                                  className="border-t border-slate-800"
                                >
                                  <td className="px-4 py-3 text-white">
                                    {vehicle.make} {vehicle.model}
                                  </td>

                                  <td className="px-4 py-3 text-slate-300">
                                    {money(vehicle.price)}
                                  </td>

                                  <td className="px-4 py-3 text-slate-300">
                                    {vehicle.stock}
                                  </td>

                                  <td className="px-4 py-3">
                                    {vehicle.image_url ||
                                    vehicle.imageUrl ? (
                                      <img
                                        src={
                                          vehicle.image_url ||
                                          vehicle.imageUrl
                                        }
                                        alt={`${vehicle.make} ${vehicle.model}`}
                                        className="h-12 w-16 rounded-lg object-cover ring-1 ring-slate-700"
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-500">
                                        No image
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleEditVehicle(vehicle)
                                        }
                                        className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-blue-200"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteVehicle(vehicleId)
                                        }
                                        disabled={
                                          isDeleting ||
                                          deletingVehicleId !== null
                                        }
                                        className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {isDeleting
                                          ? 'Deleting…'
                                          : 'Delete'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}

                            {vehicles.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-4 py-8 text-center text-sm text-slate-500"
                                >
                                  No vehicles found in the inventory.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {editingVehicleId !== null && (
                        <div className="border-t border-slate-800 bg-slate-950/60 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(event) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  price: event.target.value,
                                }))
                              }
                              placeholder="New price"
                              className="w-full rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                            />

                            <input
                              type="number"
                              value={editForm.stock}
                              onChange={(event) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  stock: event.target.value,
                                }))
                              }
                              placeholder="New stock"
                              className="w-full rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                            />

                            <input
                              type="text"
                              value={editForm.image_url}
                              onChange={(event) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  image_url: event.target.value,
                                }))
                              }
                              placeholder="Image URL"
                              className="w-full rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateVehicle(editingVehicleId)
                              }
                              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingVehicleId(null)
                              }
                              className="rounded-xl border border-slate-700 bg-[#0b1220] px-4 py-2.5 text-sm text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {formMessage && (
                      <div
                        role="status"
                        className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
                          formMessage.toLowerCase().includes('successfully')
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {formMessage}
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Inventory health
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {dashboard?.summary?.available ?? 0}
                        </p>
                        <p className="mt-1 text-sm text-emerald-300">
                          Ready to sell
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          Pipeline
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {dashboard?.activity?.filter(
                            (item) => item.type === 'booking',
                          ).length ?? 0}
                        </p>
                        <p className="mt-1 text-sm text-blue-300">
                          Recent bookings
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                      Add stock
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Vehicle intake
                    </h2>

                    <form
                      onSubmit={handleQuickVehicleSubmit}
                      className="mt-5 space-y-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          value={quickVehicle.model}
                          onChange={(event) =>
                            setQuickVehicle((prev) => ({
                              ...prev,
                              model: event.target.value,
                            }))
                          }
                          placeholder="Model"
                          required
                          className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 sm:col-span-2"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="number"
                          min="0"
                          value={quickVehicle.price}
                          onChange={(event) =>
                            setQuickVehicle((prev) => ({
                              ...prev,
                              price: event.target.value,
                            }))
                          }
                          placeholder="Price"
                          required
                          className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />

                        <input
                          type="number"
                          min="0"
                          value={quickVehicle.stock}
                          onChange={(event) =>
                            setQuickVehicle((prev) => ({
                              ...prev,
                              stock: event.target.value,
                            }))
                          }
                          placeholder="Stock"
                          required
                          className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />
                      </div>

                      <input
                        type="text"
                        value={quickVehicle.image_url}
                        onChange={(event) =>
                          setQuickVehicle((prev) => ({
                            ...prev,
                            image_url: event.target.value,
                          }))
                        }
                        placeholder="Image URL or /images/cars/toyota-camry.svg"
                        className="w-full rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="number"
                          value={quickVehicle.year}
                          onChange={(event) =>
                            setQuickVehicle((prev) => ({
                              ...prev,
                              year: event.target.value,
                            }))
                          }
                          placeholder="Year"
                          required
                          className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                        />

                        <select
                          value={quickVehicle.category}
                          onChange={(event) =>
                            setQuickVehicle((prev) => ({
                              ...prev,
                              category: event.target.value,
                            }))
                          }
                          className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                          <option value="SUV">SUV</option>
                          <option value="Sedan">Sedan</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Coupe">Coupe</option>
                          <option value="Luxury">Luxury</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingVehicle}
                        className="w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-medium text-white shadow-[0_12px_28px_rgba(59,130,246,0.35)] transition hover:brightness-110 disabled:opacity-60"
                      >
                        {submittingVehicle
                          ? 'Adding vehicle…'
                          : 'Add to inventory'}
                      </button>
                    </form>
                  </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
                  <StatCard
                    icon={CarFront}
                    title="Total vehicles"
                    value={dashboard?.summary?.totalVehicles ?? 0}
                    hint="Fleet size"
                    tone="blue"
                  />
                  <StatCard
                    icon={Gauge}
                    title="Available"
                    value={dashboard?.summary?.available ?? 0}
                    hint="Ready to sell"
                    tone="green"
                  />
                  <StatCard
                    icon={Sparkles}
                    title="Reserved"
                    value={dashboard?.summary?.reserved ?? 0}
                    hint="Low stock"
                    tone="amber"
                  />
                  <StatCard
                    icon={CircleDollarSign}
                    title="Total value"
                    value={money(
                      dashboard?.summary?.totalValue ?? 0,
                    )}
                    hint="Portfolio value"
                    tone="violet"
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1fr]">
                  <div className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                      Inventory mix
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Status overview
                    </h2>

                    <div className="mt-6 flex items-center justify-center">
                      <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(#45c89a_0_35%,#f5b942_35%_63%,#f05a67_63%_100%)] shadow-[0_18px_40px_rgba(17,24,39,0.4)]">
                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#0b1220] text-center shadow-inner shadow-slate-950/50">
                          <div>
                            <div className="text-lg font-semibold text-white">
                              {dashboard?.summary?.available ?? 0}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Live
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {(
                        inventoryShares.length === 0
                          ? [
                              {
                                label: 'Available',
                                value: 0,
                                color: '#45c89a',
                              },
                            ]
                          : inventoryShares
                      ).map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-2xl bg-[#0b1220] px-3 py-2.5 text-sm text-slate-300"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: item.color,
                              }}
                            />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-medium text-white">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                      Recent activity
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Market activity
                    </h2>

                    <div className="mt-5 space-y-3">
                      {!dashboard?.activity ||
                      dashboard.activity.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0b1220] p-5 text-sm text-slate-400">
                          No recent activity has been recorded yet.
                        </div>
                      ) : (
                        dashboard.activity.map((item, index) => (
                          <div
                            key={`${item.type}-${index}`}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b1220] p-3.5"
                          >
                            <div>
                              <div className="text-sm font-medium text-white">
                                {item.title}
                              </div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                {item.type}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-slate-400">
                                {item.detail}
                              </div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                                {new Date(
                                  item.createdAt || Date.now(),
                                ).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                      Support
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Service desk
                    </h2>

                    <div className="mt-5 rounded-[24px] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-400/5 p-5">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200">
                          <Bell size={18} />
                        </div>

                        <div>
                          <div className="text-sm font-medium text-white">
                            Priority care
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.14em] text-blue-200">
                            Luxury support
                          </div>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-slate-300">
                        Connect with the CarCraft concierge team for
                        ownership, inventory, and premium client support
                        requests.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {customerModules.map((module) => (
                    <div
                      key={module.label}
                      className={`rounded-[26px] border border-slate-800 bg-gradient-to-br ${module.tint} p-5 shadow-[0_18px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-300">
                        {module.label}
                      </p>
                      <p className="mt-4 text-3xl font-semibold tracking-[-0.06em] text-white">
                        {module.value}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                        {module.helper}
                      </p>
                    </div>
                  ))}
                </section>

                <section
                  id="vehicle-marketplace"
                  className="rounded-[30px] border border-slate-800 bg-[#111b29]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
                >
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-blue-300">
                        Marketplace
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                        Browse all cars
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="search"
                        value={vehicleFilters.search}
                        onChange={(event) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            search: event.target.value,
                          }))
                        }
                        placeholder="Search cars"
                        className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                      />

                      <select
                        value={vehicleFilters.category}
                        onChange={(event) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      >
                        <option value="all">All categories</option>
                        {Array.from(
                          new Set(
                            (vehicles || []).map(
                              (vehicle) =>
                                vehicle.category ||
                                vehicle.cat ||
                                'Other',
                            ),
                          ),
                        ).map((category) => (
                          <option
                            key={category}
                            value={category.toLowerCase()}
                          >
                            {category}
                          </option>
                        ))}
                      </select>

                      <select
                        value={vehicleFilters.maxPrice}
                        onChange={(event) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            maxPrice: event.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      >
                        <option value="all">Any price</option>
                        <option value="20000">Under ₹20k</option>
                        <option value="30000">Under ₹30k</option>
                        <option value="50000">Under ₹50k</option>
                        <option value="100000">Under ₹1L</option>
                      </select>
                    </div>
                  </div>

                  {purchaseMessage && (
                    <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      {purchaseMessage}
                    </div>
                  )}

                  {filteredVehicles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0b1220] p-6 text-sm text-slate-400">
                      No cars match your current filters.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredVehicles.map((vehicle) => (
                        <div
                          key={vehicle.id ?? vehicle.vehicle_id}
                          className="overflow-hidden rounded-[24px] border border-slate-800 bg-[#0b1220] shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
                        >
                          <div className="flex h-40 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.55),_rgba(11,18,32,1))]">
                            {vehicle.image_url || vehicle.imageUrl ? (
                              <img
                                src={
                                  vehicle.image_url ||
                                  vehicle.imageUrl
                                }
                                alt={`${vehicle.make} ${vehicle.model}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xl font-semibold tracking-[0.16em] text-slate-200">
                                {vehicle.make
                                  ? vehicle.make
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : 'CF'}
                              </span>
                            )}
                          </div>

                          <div className="space-y-4 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-lg font-semibold text-white">
                                  {vehicle.make} {vehicle.model}
                                </div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                  {vehicle.year} ·{' '}
                                  {vehicle.category ||
                                    vehicle.cat ||
                                    'Luxury'}
                                </div>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                  Number(vehicle.stock || 0) > 0
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-red-500/15 text-red-300'
                                }`}
                              >
                                {Number(vehicle.stock || 0) > 0
                                  ? `${vehicle.stock} in stock`
                                  : 'Sold out'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-300">
                              <span>{vehicle.fuel || 'Petrol'}</span>
                              <span>
                                {vehicle.km || vehicle.mileage || 0} km
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                              <div>
                                <div className="text-xl font-semibold text-white">
                                  {money(vehicle.price)}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  Number(vehicle.stock || 0) <= 0 ||
                                  purchaseLoadingId ===
                                    (vehicle.id ?? vehicle.vehicle_id)
                                }
                                onClick={() =>
                                  handlePurchaseVehicle(
                                    vehicle.id ?? vehicle.vehicle_id,
                                  )
                                }
                                className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {purchaseLoadingId ===
                                (vehicle.id ?? vehicle.vehicle_id)
                                  ? 'Processing…'
                                  : Number(vehicle.stock || 0) > 0
                                    ? 'Purchase'
                                    : 'Unavailable'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
