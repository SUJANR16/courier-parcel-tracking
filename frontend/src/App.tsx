import './App.css'
import { useState, type FormEvent } from 'react'
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Globe2,
  Headphones,
  MapPin,
  Menu,
  Package,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  Truck,
  X,
  Zap,
} from 'lucide-react'
import './App.css'
import AdminDashboard from './AdminDashboard'
import {
  createShipment,
  getShipmentByTrackingId,
  type ShipmentStatus,
} from './services/shipments'

type TrackingEvent = {
  title: string
  description: string
  location: string
  time: string
  completed: boolean
  current?: boolean
}

type TrackingResult = {
  id: string
  status: ShipmentStatus
  origin: string
  destination: string
  estimated: string
  progress: number
  description: string
  weight?: number
  price?: number
  deliveryType?: 'Standard' | 'Express'
  events: TrackingEvent[]
}

type BookingFormData = {
  senderName: string
  senderPhone: string
  senderAddress: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  weight: string
  deliveryType: 'Standard' | 'Express'
}

const initialBookingForm: BookingFormData = {
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  weight: '1',
  deliveryType: 'Standard',
}

const demoShipments: Record<string, TrackingResult> = {
  PTR20261001: {
    id: 'PTR20261001',
    status: 'In transit',
    origin: 'Chennai, Tamil Nadu',
    destination: 'Coimbatore, Tamil Nadu',
    estimated: '29 October 2026',
    progress: 60,
    description: 'Your parcel is travelling to its destination.',
    events: [
      {
        title: 'Shipment booked',
        description: 'Shipment information was registered.',
        location: 'Chennai, Tamil Nadu',
        time: '28 Oct · 09:00 AM',
        completed: true,
      },
      {
        title: 'Parcel picked up',
        description: 'The parcel was collected from the sender.',
        location: 'Chennai, Tamil Nadu',
        time: '28 Oct · 10:30 AM',
        completed: true,
      },
      {
        title: 'Arrived at sorting facility',
        description: 'The parcel reached a processing facility.',
        location: 'Chennai Sorting Hub',
        time: '28 Oct · 12:15 PM',
        completed: true,
      },
      {
        title: 'In transit',
        description: 'The parcel is moving through the delivery network.',
        location: 'Between sorting facilities',
        time: '28 Oct · 02:00 PM',
        completed: true,
        current: true,
      },
      {
        title: 'Out for delivery',
        description: 'The parcel will be handed to a local delivery team.',
        location: 'Coimbatore, Tamil Nadu',
        time: 'Pending',
        completed: false,
      },
      {
        title: 'Delivered',
        description: 'The parcel will be marked delivered after handover.',
        location: 'Coimbatore, Tamil Nadu',
        time: 'Pending',
        completed: false,
      },
    ],
  },
  PTR20261002: {
    id: 'PTR20261002',
    status: 'Out for delivery',
    origin: 'Chennai, Tamil Nadu',
    destination: 'Bengaluru, Karnataka',
    estimated: '28 October 2026',
    progress: 85,
    description: 'Your parcel is with the local delivery team.',
    events: [
      {
        title: 'Shipment booked',
        description: 'Shipment information was registered.',
        location: 'Chennai, Tamil Nadu',
        time: '27 Oct · 08:30 AM',
        completed: true,
      },
      {
        title: 'Parcel picked up',
        description: 'The parcel was collected from the sender.',
        location: 'Chennai, Tamil Nadu',
        time: '27 Oct · 10:00 AM',
        completed: true,
      },
      {
        title: 'Arrived at sorting facility',
        description: 'The parcel reached a processing facility.',
        location: 'Bengaluru Sorting Hub',
        time: '28 Oct · 06:30 AM',
        completed: true,
      },
      {
        title: 'In transit',
        description: 'The parcel reached the destination delivery network.',
        location: 'Bengaluru, Karnataka',
        time: '28 Oct · 08:00 AM',
        completed: true,
      },
      {
        title: 'Out for delivery',
        description: 'The parcel is with the local delivery team.',
        location: 'Bengaluru, Karnataka',
        time: '28 Oct · 10:00 AM',
        completed: true,
        current: true,
      },
      {
        title: 'Delivered',
        description: 'Delivery confirmation is pending.',
        location: 'Bengaluru, Karnataka',
        time: 'Pending',
        completed: false,
      },
    ],
  },
}

const services = [
  {
    number: '01',
    icon: Zap,
    title: 'Express delivery',
    description:
      'For time-sensitive parcels that need priority handling and a faster delivery experience.',
    tag: 'PRIORITY SHIPPING',
  },
  {
    number: '02',
    icon: Package,
    title: 'Standard shipping',
    description:
      'A dependable delivery option for everyday parcels, documents and online orders.',
    tag: 'EVERYDAY DELIVERY',
  },
  {
    number: '03',
    icon: Globe2,
    title: 'Long-distance shipping',
    description:
      'A clear, organised shipping journey for parcels moving between cities and regions.',
    tag: 'WIDER REACH',
  },
]

const statusDescriptions: Record<ShipmentStatus, string> = {
  Booked: 'Your shipment booking has been confirmed.',
  'Picked up': 'Your parcel has been picked up by the courier.',
  'In transit': 'Your parcel is travelling to its destination.',
  'Out for delivery': 'Your parcel is with the local delivery team.',
  Delivered: 'Your parcel has been delivered.',
}

const statusEventTitles: ShipmentStatus[] = [
  'Booked',
  'Picked up',
  'In transit',
  'Out for delivery',
  'Delivered',
]

function makeTrackingResult(data: {
  id: string
  status: ShipmentStatus
  origin: string
  destination: string
  estimated: string
  progress: number
  description: string
  weight?: number
  price?: number
  deliveryType?: 'Standard' | 'Express'
}): TrackingResult {
  const currentIndex = statusEventTitles.indexOf(data.status)

  return {
    ...data,
    events: statusEventTitles.map((status, index) => ({
      title:
        status === 'Booked'
          ? 'Shipment booked'
          : status === 'Picked up'
            ? 'Parcel picked up'
            : status,
      description: statusDescriptions[status],
      location:
        index < 2
          ? data.origin
          : index === 2
            ? 'Courier delivery network'
            : data.destination,
      time: index <= currentIndex ? 'Status recorded' : 'Pending',
      completed: index <= currentIndex,
      current: index === currentIndex,
    })),
  }
}

function getCityOrArea(address: string): string {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2) {
    return parts.slice(-2).join(', ')
  }

  return parts[0] || 'Location not specified'
}

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="ParcelTrack Pro home">
      <span className="brand-mark">
        <PackageCheck size={25} />
      </span>
      <span className="brand-copy">
        <strong>
          parceltrack<span>pro</span>
        </strong>
        <small>LOGISTICS REIMAGINED</small>
      </span>
    </a>
  )
}

function StatusPill({ status }: { status: ShipmentStatus }) {
  return (
    <span className="status-pill">
      <span className="status-dot" />
      {status}
    </span>
  )
}

function TrackingDetails({
  shipment,
  onBack,
}: {
  shipment: TrackingResult
  onBack: () => void
}) {
  return (
    <div className="details-page">
      <header className="details-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to home
        </button>
        <Brand />
      </header>

      <main className="details-main">
        <div className="eyebrow centered">SHIPMENT DETAILS</div>
        <h1 className="details-title">
          Your parcel is <span>on its journey.</span>
        </h1>
        <p className="details-subtitle">
          Review the shipment status and follow each step of its journey.
        </p>

        <section className="shipment-summary">
          <div className="summary-top">
            <div className="summary-icon">
              <PackageCheck size={29} />
            </div>
            <div className="summary-identity">
              <span className="muted-label">TRACKING NUMBER</span>
              <h2>{shipment.id}</h2>
              <span className="demo-label">
                {shipment.id.startsWith('PTR202610')
                  ? 'DEMONSTRATION SHIPMENT'
                  : 'TRACKED SHIPMENT'}
              </span>
            </div>
            <StatusPill status={shipment.status} />
          </div>

          <div className="progress-heading">
            <span>Journey progress</span>
            <strong>{shipment.progress}%</strong>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={shipment.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${shipment.progress}%` }} />
          </div>

          <div className="route-summary">
            <div>
              <span className="muted-label">ORIGIN</span>
              <strong>{shipment.origin}</strong>
            </div>
            <ArrowRight className="route-arrow" size={21} />
            <div>
              <span className="muted-label">DESTINATION</span>
              <strong>{shipment.destination}</strong>
            </div>
          </div>
        </section>

        <div className="details-grid">
          <section className="timeline-card">
            <div className="timeline-heading">
              <div>
                <div className="eyebrow">PARCEL ACTIVITY</div>
                <h2>Tracking history</h2>
              </div>
              <span className="sample-badge">Status timeline</span>
            </div>

            <div className="timeline-list">
              {shipment.events.map((event) => (
                <div
                  className={`timeline-event ${
                    event.completed ? 'completed' : ''
                  } ${event.current ? 'current' : ''}`}
                  key={event.title}
                >
                  <div className="timeline-marker">
                    {event.completed ? (
                      <Check size={18} />
                    ) : (
                      <Clock3 size={17} />
                    )}
                  </div>

                  <div className="timeline-event-body">
                    <div className="timeline-title-row">
                      <h3>{event.title}</h3>
                      {event.current && (
                        <span className="current-badge">CURRENT</span>
                      )}
                    </div>
                    <p>{event.description}</p>
                    <span className="event-detail">
                      <MapPin size={13} />
                      {event.location}
                    </span>
                    <span className="event-detail">
                      <Clock3 size={13} />
                      {event.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="shipment-info-card">
            <div className="eyebrow">DELIVERY INFORMATION</div>
            <h2>Shipment overview</h2>

            <div className="info-row">
              <span>Tracking ID</span>
              <strong>{shipment.id}</strong>
            </div>
            <div className="info-row">
              <span>Current status</span>
              <strong>{shipment.status}</strong>
            </div>
            <div className="info-row">
              <span>Origin</span>
              <strong>{shipment.origin}</strong>
            </div>
            <div className="info-row">
              <span>Destination</span>
              <strong>{shipment.destination}</strong>
            </div>
            <div className="info-row">
              <span>Estimated delivery</span>
              <strong>{shipment.estimated}</strong>
            </div>

            {shipment.weight !== undefined && (
              <div className="info-row">
                <span>Parcel weight</span>
                <strong>{shipment.weight} kg</strong>
              </div>
            )}

            {shipment.price !== undefined && (
              <div className="info-row">
                <span>Shipping price</span>
                <strong>₹{shipment.price.toFixed(2)}</strong>
              </div>
            )}

            {shipment.deliveryType && (
              <div className="info-row">
                <span>Delivery type</span>
                <strong>{shipment.deliveryType}</strong>
              </div>
            )}

            <div className="demo-notice">
              <ShieldCheck size={19} />
              <p>
                Tracking information comes from the project database or sample
                records. It is not connected to a live courier network.
              </p>
            </div>

            <button className="primary-button full-button" onClick={onBack}>
              <ArrowLeft size={17} />
              Return to home
            </button>
          </aside>
        </div>
      </main>

      <footer className="details-footer">
        ParcelTrack Pro · Courier Parcel Tracking System
      </footer>
    </div>
  )
}

function App() {
  const [showAdmin, setShowAdmin] = useState(
    window.location.hash === '#admin',
  )
  const [trackingId, setTrackingId] = useState('PTR20261001')
  const [selectedShipment, setSelectedShipment] =
    useState<TrackingResult | null>(null)
  const [searchError, setSearchError] = useState('')
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const [bookingForm, setBookingForm] =
    useState<BookingFormData>(initialBookingForm)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [newTrackingId, setNewTrackingId] = useState('')

  async function trackParcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const id = trackingId.trim().toUpperCase()

    if (!id) {
      setSearchError('Please enter a tracking number.')
      setSelectedShipment(null)
      return
    }

    setTrackingLoading(true)
    setSearchError('')

    try {
      if (demoShipments[id]) {
        setSelectedShipment(demoShipments[id])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const shipment = await getShipmentByTrackingId(id)

      if (!shipment) {
        setSearchError(
          'We could not find that shipment. Check the tracking number and try again.',
        )
        setSelectedShipment(null)
        return
      }

      setSelectedShipment(
        makeTrackingResult({
          id: shipment.id,
          status: shipment.status,
          origin: shipment.origin,
          destination: shipment.destination,
          estimated: shipment.estimated,
          progress: shipment.progress,
          description: shipment.description,
          weight: shipment.weight,
          price: shipment.price,
          deliveryType: shipment.deliveryType,
        }),
      )

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Tracking lookup failed:', error)
      setSearchError(
        'Unable to look up the shipment. Please check your Firebase connection and try again.',
      )
    } finally {
      setTrackingLoading(false)
      setMenuOpen(false)
    }
  }

  function searchDemo(id: string) {
    setTrackingId(id)
    setSearchError('')
    document.getElementById('tracking')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  function updateBookingField(
    field: keyof BookingFormData,
    value: string,
  ) {
    setBookingForm((current) => ({
      ...current,
      [field]: value,
    }))
    setBookingError('')
    setBookingMessage('')
  }

  async function bookParcel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBookingError('')
    setBookingMessage('')
    setNewTrackingId('')

    const weight = Number(bookingForm.weight)

    if (!bookingForm.senderName.trim() || !bookingForm.receiverName.trim()) {
      setBookingError('Please enter both sender and receiver names.')
      return
    }

    const phonePattern = /^[0-9+()\s-]{8,15}$/

    if (
      !phonePattern.test(bookingForm.senderPhone.trim()) ||
      !phonePattern.test(bookingForm.receiverPhone.trim())
    ) {
      setBookingError('Please enter valid sender and receiver phone numbers.')
      return
    }

    if (
      !bookingForm.senderAddress.trim() ||
      !bookingForm.receiverAddress.trim()
    ) {
      setBookingError('Please enter both pickup and delivery addresses.')
      return
    }

    if (!Number.isFinite(weight) || weight < 0.1 || weight > 100) {
      setBookingError('Parcel weight must be between 0.1 kg and 100 kg.')
      return
    }

    setBookingLoading(true)

    
try {
  const origin = getCityOrArea(bookingForm.senderAddress)
  const destination = getCityOrArea(bookingForm.receiverAddress)

  const result = await createShipment({
    senderName: bookingForm.senderName,
    senderPhone: bookingForm.senderPhone,
    senderAddress: bookingForm.senderAddress,
    receiverName: bookingForm.receiverName,
    receiverPhone: bookingForm.receiverPhone,
    receiverAddress: bookingForm.receiverAddress,
    origin,
    destination,
    weight,
    deliveryType: bookingForm.deliveryType,
  })

  setNewTrackingId(result.trackingId)
  setTrackingId(result.trackingId)

  setBookingMessage(
    `Booking confirmed! Tracking ID: ${result.trackingId}. Price: ₹${result.price.toFixed(2)}.`,
  )

  setBookingForm(initialBookingForm)

    } catch (error: unknown) {
      console.error('Booking failed:', error)

      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Firebase error code:', error.code)
      }

      if (error instanceof Error) {
        console.error('Error message:', error.message)
        setBookingError(error.message)
      } else {
        setBookingError(
          'Booking failed. Please check the browser console for details.',
        )
      }
    } finally {
      setBookingLoading(false)
    }
  }

  if (showAdmin) {
    return (
      <AdminDashboard
        onBack={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setShowAdmin(false)
        }}
      />
    )
  }

  if (selectedShipment) {
    return (
      <TrackingDetails
        shipment={selectedShipment}
        onBack={() => {
          setSelectedShipment(null)
          setSearchError('')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    )
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span className="announcement-dot" />
        SMARTER SHIPPING. CLEARER TRACKING. BETTER DELIVERIES.
        <ArrowRight size={15} />
      </div>

      <header className="site-header">
        <div className="nav-inner">
          <Brand />

          <button
            className="mobile-menu-button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}>
            <a href="#home" onClick={() => setMenuOpen(false)}>
              Home
            </a>
            <a href="#services" onClick={() => setMenuOpen(false)}>
              Services
            </a>
            <a href="#tracking" onClick={() => setMenuOpen(false)}>
              Track Parcel
            </a>
            <a href="#booking" onClick={() => setMenuOpen(false)}>
              Book Parcel
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About Us
            </a>
            <a
              href="#admin"
              onClick={(event) => {
                event.preventDefault()
                window.history.replaceState(null, '', '#admin')
                setShowAdmin(true)
                setMenuOpen(false)
              }}
            >
              Admin
            </a>
          </nav>

          <a className="header-cta" href="#tracking">
            Track shipment <ArrowUpRight size={17} />
          </a>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-icon">
                  <Zap size={16} />
                </span>
                YOUR PARCEL. YOUR PEACE OF MIND.
              </div>

              <h1>
                Every delivery has a story. <span>Track every step.</span>
              </h1>

              <p className="hero-description">
                From pickup to your doorstep, experience a smarter way to ship,
                track and manage your deliveries — all in one place.
              </p>

              <div className="hero-actions">
                <a className="primary-button" href="#tracking">
                  Track your parcel <ArrowRight size={18} />
                </a>
                <a className="text-button" href="#services">
                  Explore services <ArrowUpRight size={17} />
                </a>
              </div>

              <div className="trust-note">
                <span className="trust-icon">
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <strong>Built around your trust</strong>
                  <p>Transparent updates. Reliable information.</p>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-heading">
                <span>
                  <span className="live-dot" /> TRACKING PREVIEW
                </span>
                <span className="demo-chip">DEMO UI</span>
              </div>

              <div className="route-card">
                <div className="route-card-label">SHIPMENT ID</div>
                <div className="route-card-number">PTR-2048-7862</div>

                <div className="route-illustration">
                  <svg
                    viewBox="0 0 600 180"
                    role="img"
                    aria-label="Illustration of a parcel route"
                  >
                    <path
                      d="M40 126 C120 126, 130 50, 220 66 S355 145, 410 95 S490 18, 560 48"
                      fill="none"
                      stroke="#f39735"
                      strokeWidth="3.5"
                      strokeDasharray="8 8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="route-pin origin-pin">
                    <MapPin size={20} />
                  </span>
                  <span className="route-pin destination-pin">
                    <Truck size={20} />
                  </span>
                  <span className="route-caption">
                    YOUR PARCEL IS ON ITS WAY
                  </span>
                </div>

                <div className="route-endpoints">
                  <div>
                    <span className="endpoint-dot green-dot" />
                    <div>
                      <small>ORIGIN</small>
                      <strong>Chennai, IN</strong>
                    </div>
                  </div>
                  <div className="endpoint-divider" />
                  <div>
                    <span className="endpoint-dot orange-dot" />
                    <div>
                      <small>DESTINATION</small>
                      <strong>Coimbatore, IN</strong>
                    </div>
                  </div>
                </div>

                <div className="route-progress">
                  <div>
                    <span>Journey progress</span>
                    <strong>65%</strong>
                  </div>
                  <div className="route-progress-track">
                    <span />
                  </div>
                  <small>Illustrative tracking data</small>
                </div>

                <div className="floating-note secured-note">
                  <span className="floating-icon green-bg">
                    <PackageCheck size={22} />
                  </span>
                  <div>
                    <strong>Parcel secured</strong>
                    <small>Tracking made simple</small>
                  </div>
                  <CheckCircle2 className="floating-check" size={20} />
                </div>

                <div className="floating-note delivery-note">
                  <span className="floating-icon orange-bg">
                    <Truck size={22} />
                  </span>
                  <div>
                    <strong>Doorstep delivery</strong>
                    <small>Every step matters</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tracking-section" id="tracking">
          <div className="section-container tracking-container">
            <div className="eyebrow centered">SHIPMENT VISIBILITY</div>
            <h2 className="section-title">
              Your parcel, <span>one search away.</span>
            </h2>
            <p className="section-description">
              Enter a tracking ID to check a demonstration or booked shipment.
            </p>

            <form className="tracking-form" onSubmit={trackParcel}>
              <PackageSearch className="search-package-icon" size={25} />
              <input
                aria-label="Tracking number"
                value={trackingId}
                onChange={(event) => {
                  setTrackingId(event.target.value)
                  setSearchError('')
                }}
                placeholder="Enter your tracking number"
              />
              <button
                type="submit"
                className="primary-button"
                disabled={trackingLoading}
              >
                {trackingLoading ? 'Searching...' : 'Track parcel'}
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="demo-ids">
              Try demo IDs:
              <button type="button" onClick={() => searchDemo('PTR20261001')}>
                PTR20261001
              </button>
              <span>·</span>
              <button type="button" onClick={() => searchDemo('PTR20261002')}>
                PTR20261002
              </button>
            </div>

            {searchError && (
              <div className="search-error" role="alert">
                <PackageSearch size={19} />
                {searchError}
              </div>
            )}

            <div className="sample-result">
              <span className="result-icon">
                <PackageCheck size={28} />
              </span>
              <div className="result-details">
                <span className="muted-label">SAMPLE TRACKING NUMBER</span>
                <strong>PTR20261001</strong>
                <span>Destination: Coimbatore, Tamil Nadu</span>
              </div>
              <div className="result-status">
                <StatusPill status="In transit" />
                <span>Estimated delivery: 29 October 2026</span>
              </div>
            </div>

            <p className="section-footnote">
              Sample records are for demonstration. Newly booked shipments are
              stored in Firebase.
            </p>
          </div>
        </section>

        <section className="booking-section" id="booking">
          <div className="section-container">
            <div className="eyebrow centered">START A DELIVERY</div>
            <h2 className="section-title">
              Book your <span>parcel today.</span>
            </h2>
            <p className="section-description">
              Enter the sender, receiver and parcel details to create a
              tracking number.
            </p>

            <form className="booking-form" onSubmit={bookParcel}>
              <div className="booking-form-grid">
                <section className="booking-form-card">
                  <div className="booking-card-heading">
                    <span className="booking-icon">
                      <Package size={21} />
                    </span>
                    <div>
                      <h3>Sender details</h3>
                      <p>Information about the pickup</p>
                    </div>
                  </div>

                  <label htmlFor="senderName">Sender name</label>
                  <input
                    id="senderName"
                    value={bookingForm.senderName}
                    onChange={(event) =>
                      updateBookingField('senderName', event.target.value)
                    }
                    placeholder="Enter sender name"
                    required
                  />

                  <label htmlFor="senderPhone">Sender phone</label>
                  <input
                    id="senderPhone"
                    type="tel"
                    value={bookingForm.senderPhone}
                    onChange={(event) =>
                      updateBookingField('senderPhone', event.target.value)
                    }
                    placeholder="Enter phone number"
                    required
                  />

                  <label htmlFor="senderAddress">Pickup address</label>
                  <textarea
                    id="senderAddress"
                    value={bookingForm.senderAddress}
                    onChange={(event) =>
                      updateBookingField('senderAddress', event.target.value)
                    }
                    placeholder="Enter address including city and state"
                    rows={3}
                    required
                  />
                </section>

                <section className="booking-form-card">
                  <div className="booking-card-heading">
                    <span className="booking-icon">
                      <Truck size={21} />
                    </span>
                    <div>
                      <h3>Receiver details</h3>
                      <p>Information about the delivery</p>
                    </div>
                  </div>

                  <label htmlFor="receiverName">Receiver name</label>
                  <input
                    id="receiverName"
                    value={bookingForm.receiverName}
                    onChange={(event) =>
                      updateBookingField('receiverName', event.target.value)
                    }
                    placeholder="Enter receiver name"
                    required
                  />

                  <label htmlFor="receiverPhone">Receiver phone</label>
                  <input
                    id="receiverPhone"
                    type="tel"
                    value={bookingForm.receiverPhone}
                    onChange={(event) =>
                      updateBookingField('receiverPhone', event.target.value)
                    }
                    placeholder="Enter phone number"
                    required
                  />

                  <label htmlFor="receiverAddress">Delivery address</label>
                  <textarea
                    id="receiverAddress"
                    value={bookingForm.receiverAddress}
                    onChange={(event) =>
                      updateBookingField('receiverAddress', event.target.value)
                    }
                    placeholder="Enter address including city and state"
                    rows={3}
                    required
                  />
                </section>
              </div>

              <section className="booking-form-card parcel-details-card">
                <div className="booking-card-heading">
                  <span className="booking-icon">
                    <PackageCheck size={21} />
                  </span>
                  <div>
                    <h3>Parcel details</h3>
                    <p>Choose the weight and delivery speed</p>
                  </div>
                </div>

                <div className="parcel-fields">
                  <div>
                    <label htmlFor="parcelWeight">Weight (kg)</label>
                    <input
                      id="parcelWeight"
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={bookingForm.weight}
                      onChange={(event) =>
                        updateBookingField('weight', event.target.value)
                      }
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="deliveryType">Delivery type</label>
                    <select
                      id="deliveryType"
                      value={bookingForm.deliveryType}
                      onChange={(event) =>
                        updateBookingField('deliveryType', event.target.value)
                      }
                    >
                      <option value="Standard">Standard delivery</option>
                      <option value="Express">Express delivery</option>
                    </select>
                  </div>

                  <div className="price-preview">
                    <span>Estimated shipping charge</span>
                    <strong>
                      ₹
                      {Math.max(
                        60,
                        Number(bookingForm.weight || 0) *
                          (bookingForm.deliveryType === 'Express' ? 120 : 60),
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <p className="booking-price-note">
                  Indicative project pricing: Standard ₹60/kg, Express ₹120/kg,
                  with a minimum charge of ₹60.
                </p>
              </section>

              {bookingError && (
                <div className="search-error" role="alert">
                  {bookingError}
                </div>
              )}

              {bookingMessage && (
                <div className="booking-success" role="status">
                  <CheckCircle2 size={21} />
                  <div>
                    <strong>Booking created successfully!</strong>
                    <p>{bookingMessage}</p>
                    <span>Your tracking number:</span>
                    <strong className="booking-tracking-code">
                      {newTrackingId}
                    </strong>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setSelectedShipment(null)
                        document
                          .getElementById('tracking')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      Track this parcel <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              <button
                className="primary-button booking-submit"
                type="submit"
                disabled={bookingLoading}
              >
                {bookingLoading
                  ? 'Creating booking...'
                  : 'Confirm parcel booking'}
                <ArrowRight size={18} />
              </button>

              <p className="section-footnote">
                This project stores tracking details in Firebase. Customer
                contact information is not included in the public tracking
                document.
              </p>
            </form>
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="section-container">
            <div className="section-topline">
              <div>
                <div className="eyebrow">WHAT WE OFFER</div>
                <h2 className="section-title left-title">
                  Shipping made <span>simpler.</span>
                </h2>
                <p className="section-description left-description">
                  Flexible delivery options designed around the journey your
                  parcel needs.
                </p>
              </div>
              <a href="#tracking" className="text-button">
                Track a parcel <ArrowUpRight size={17} />
              </a>
            </div>

            <div className="service-grid">
              {services.map((service) => {
                const Icon = service.icon

                return (
                  <article className="service-card" key={service.number}>
                    <div className="service-card-top">
                      <span className="service-icon">
                        <Icon size={24} />
                      </span>
                      <span className="service-number">{service.number}</span>
                    </div>
                    <span className="service-tag">{service.tag}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <a href="#tracking" className="service-link">
                      Explore tracking <ArrowDownRight size={17} />
                    </a>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="section-container about-grid">
            <div className="about-symbol">
              <div className="about-symbol-inner">
                <PackageCheck size={58} />
              </div>
              <span className="about-orbit orbit-one" />
              <span className="about-orbit orbit-two" />
              <span className="about-mini-card">
                <CheckCircle2 size={18} /> Every step matters
              </span>
            </div>

            <div className="about-copy">
              <div className="eyebrow">ABOUT PARCELTRACK PRO</div>
              <h2 className="section-title left-title">
                Clarity at every <span>delivery step.</span>
              </h2>
              <p>
                ParcelTrack Pro is a courier parcel tracking system project
                designed to make shipment information easier to understand.
                The goal is to bring booking, tracking and delivery management
                into one organised digital experience.
              </p>

              <div className="about-features">
                <div>
                  <CheckCircle2 size={19} />
                  <span>Clear shipment status</span>
                </div>
                <div>
                  <CheckCircle2 size={19} />
                  <span>Easy tracking lookup</span>
                </div>
                <div>
                  <CheckCircle2 size={19} />
                  <span>Firebase-backed booking records</span>
                </div>
                <div>
                  <CheckCircle2 size={19} />
                  <span>Responsive user interface</span>
                </div>
              </div>

              <a href="#booking" className="primary-button">
                Book a parcel <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-inner">
            <div className="cta-icon">
              <Headphones size={27} />
            </div>
            <div>
              <span className="eyebrow">NEED A QUICK UPDATE?</span>
              <h2>Your next delivery starts with a tracking number.</h2>
              <p>Book a parcel or look up an existing shipment.</p>
            </div>
            <a href="#tracking" className="primary-button cta-button">
              Track a parcel <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Brand />
          <p>Smarter shipping. Clearer tracking. Better deliveries.</p>
          <span>© 2026 ParcelTrack Pro · Academic project demonstration</span>
        </div>
      </footer>
    </div>
  )
}

export default App