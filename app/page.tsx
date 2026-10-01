'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { signIn, signOut, signUp, useSession } from '@/lib/auth-client'
import { formatBookingDate, getBookingDateWindow, getBookingStatus } from '@/lib/booking-time'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Dumbbell,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'

type CourtStatus = 'available' | 'booked' | 'maintenance'
type View = 'booking' | 'schedule' | 'settings' | 'admin'
type ScheduleTab = 'upcoming' | 'in-use' | 'completed'

type Booking = {
  id: string
  court: string
  date: string
  dateLabel: string
  time: string
  status: 'upcoming' | 'in-use' | 'completed'
  email: string
  courtId?: string
}

type CourtData = { id: string; name: string; status: CourtStatus }
type ApiBooking = { id: string; court: string; court_id: string; booking_date: string; start_time: string; end_time: string; status: string }
type BookingResponse = { courts: CourtData[]; bookings: ApiBooking[] }

const jsonFetcher = <T,>(url: string) => fetch(url).then(async (response) => {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data as T
})
const fetcher = (url: string) => jsonFetcher<BookingResponse>(url)

function mapBooking(booking: ApiBooking, email: string): Booking {
  const date = booking.booking_date.slice(0, 10)
  const derivedStatus = getBookingStatus(date, booking.start_time.slice(0, 8), booking.end_time.slice(0, 8), booking.status)

return {
    id: booking.id,
    court: booking.court,
    courtId: booking.court_id,
    date,
    dateLabel: fullDateLabel(date),
    time: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`,
    status: derivedStatus,
    email,
  }
}
const times = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
const { today, tomorrow } = getBookingDateWindow()

const dateLabel = (value: string) => `${value === today ? 'Today' : 'Tomorrow'}, ${formatBookingDate(value, { day: '2-digit', month: 'short' })}`

const fullDateLabel = (value: string) => formatBookingDate(value)


function BasketballMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`basketball-mark ${small ? 'basketball-mark-small' : ''}`} aria-hidden="true">
      <span />
    </span>
  )
}

function CourtIllustration({ status, selected }: { status: CourtStatus; selected: boolean }) {
  return (
    <div className={`court-illustration court-${status} ${selected ? 'court-selected' : ''}`} aria-hidden="true">
      <div className="court-hoop court-hoop-top"><i /></div>
      <div className="court-half-line" />
      <div className="court-center-circle" />
      <div className="court-key court-key-top" />
      <div className="court-key court-key-bottom" />
      <div className="court-arc court-arc-top" />
      <div className="court-arc court-arc-bottom" />
      <div className="court-hoop court-hoop-bottom"><i /></div>
    </div>
  )
}

function StatusPill({ status }: { status: CourtStatus }) {
  const labels = { available: 'Available', booked: 'Booked', maintenance: 'Maintenance' }
  return <span className={`status-pill status-${status}`}><span />{labels[status]}</span>
}

function CourtCard({ court, status, selected, onSelect }: { court: string; status: CourtStatus; selected: boolean; onSelect: () => void }) {
  const isAvailable = status === 'available'
  return (
    <button
      type="button"
      className={`court-card ${selected ? 'is-selected' : ''} ${!isAvailable ? 'is-disabled' : ''}`}
      onClick={onSelect}
      disabled={!isAvailable}
      aria-label={`${court}, ${status}${isAvailable ? ', select court' : ''}`}
    >
      <div className="court-card-head">
        <div>
          <p className="court-name">{court}</p>
          <p className="court-meta">Indoor · Full size</p>
        </div>
        <StatusPill status={status} />
      </div>
      <CourtIllustration status={status} selected={selected} />
      <div className="court-card-foot">
        {isAvailable ? <><span>Select court</span><ArrowRight size={15} /></> : <span>{status === 'maintenance' ? 'Unavailable today' : 'Reserved for another student'}</span>}
      </div>
    </button>
  )
}

function QRVisual() {
  return (
    <div className="qr-visual" aria-label="Mock QR code for booking confirmation">
      <div className="qr-corner qr-one" /><div className="qr-corner qr-two" /><div className="qr-corner qr-three" />
      <div className="qr-dots">{Array.from({ length: 34 }).map((_, index) => <i key={index} style={{ opacity: index % 4 === 0 ? 0.35 : 1 }} />)}</div>
    </div>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || (mode === 'sign-up' && !name.trim())) {
      setError(mode === 'sign-up' ? 'Enter your name, a valid email, and a password with at least 8 characters.' : 'Enter a valid email and password with at least 8 characters.')
      return
    }
    setPending(true)
    setError('')
    const result = mode === 'sign-in'
      ? await signIn.email({ email: email.trim().toLowerCase(), password })
      : await signUp.email({ email: email.trim().toLowerCase(), password, name: name.trim() })
    setPending(false)
    if (result.error) setError('We could not sign you in with those details. Please try again.')
  }
  return (
    <main className="login-page">
      <div className="login-art" aria-hidden="true"><div className="login-court-line" /><div className="login-ball"><BasketballMark /></div></div>
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-lockup"><div className="brand-icon"><BasketballMark small /></div><div><strong>Court Booking</strong><span>University Sports Center</span></div></div>
        <div className="login-copy"><p className="eyebrow">STUDENT PORTAL</p><h1 id="login-title">Book your next<br /><em>game.</em></h1><p>{mode === 'sign-in' ? 'Sign in to reserve courts and manage your schedule.' : 'Create your student account to start booking.'}</p></div>
        {mode === 'sign-up' && <><label className="field-label" htmlFor="name">Full name</label><div className={`input-wrap ${error ? 'has-error' : ''}`}><UserRound size={18} /><input id="name" value={name} onChange={(event) => { setName(event.target.value); setError('') }} autoComplete="name" placeholder="Your full name" /></div></>}
        <label className="field-label" htmlFor="email">University email</label>
        <div className={`input-wrap ${error ? 'has-error' : ''}`}><UserRound size={18} /><input id="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="you@university.ac.th" autoComplete="email" /></div>
        <label className="field-label" htmlFor="password">Password</label>
        <div className={`input-wrap ${error ? 'has-error' : ''}`}><ShieldCheck size={18} /><input id="password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void submit() }} placeholder="At least 8 characters" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="primary-button login-button" onClick={() => void submit()} disabled={pending}>{pending ? 'Please wait…' : mode === 'sign-in' ? 'Continue to booking' : 'Create account'} <ArrowRight size={17} /></button>
        <button type="button" className="text-button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError('') }}>{mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
        <p className="login-note"><ShieldCheck size={14} /> Secure account sessions powered by Better Auth</p>
      </section>
    </main>
  )
}

function Sidebar({ email, isAdmin, view, setView, collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout }: { email: string; isAdmin: boolean; view: View; setView: (view: View) => void; collapsed: boolean; setCollapsed: (value: boolean) => void; mobileOpen: boolean; setMobileOpen: (value: boolean) => void; onLogout: () => void }) {
  const nav = [
    { id: 'booking' as View, label: 'Court Booking', icon: LayoutDashboard },
    { id: 'schedule' as View, label: 'My Schedule', icon: CalendarDays },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Admin Dashboard', icon: ShieldCheck }] : []),
    { id: 'settings' as View, label: 'Settings', icon: Settings },
  ]
  return <>
    {mobileOpen && <button type="button" className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><div className="brand-lockup sidebar-brand"><div className="brand-icon"><BasketballMark small /></div><div className="sidebar-brand-copy"><strong>Court Booking</strong><span>University Sports Center</span></div></div><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
      <div className="user-chip"><div className="avatar">{email.charAt(0).toUpperCase()}</div><div className="user-chip-copy"><strong>{email.split('@')[0]}</strong><span>{email}</span></div></div>
      <nav className="side-nav" aria-label="Main navigation"><p className="nav-label">MENU</p>{nav.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setMobileOpen(false) }}><Icon size={18} /><span>{label}</span>{id === 'booking' && <span className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><button type="button" className="language-button"><Globe2 size={16} /><span>EN</span><span className="language-muted">TH</span><ChevronDown size={13} /></button><button type="button" className="nav-item logout-button" onClick={onLogout}><LogOut size={18} /><span>Log out</span></button><button type="button" className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><ChevronLeft size={17} className={collapsed ? 'rotate-180' : ''} /><span>Collapse menu</span></button></div>
    </aside>
  </>
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: number; accent: string }) {
  return <div className="summary-card"><div className={`summary-icon ${accent}`}><Icon size={18} /></div><div><p>{label}</p><strong>{value}</strong></div></div>
}

function BookingModal({ court, date, time, email, confirming, onClose, onConfirm }: { court: string; date: string; time: string; email: string; confirming: boolean; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button type="button" className="modal-close" onClick={onClose} aria-label="Close confirmation"><X size={19} /></button><div className="modal-kicker">Review your reservation</div><h2 id="modal-title">Confirm booking</h2><p className="modal-subtitle">Make sure everything looks right before reserving your court.</p><div className="modal-court-preview"><CourtIllustration status="available" selected /><div><span className="modal-label">COURT</span><strong>{court}</strong><span className="status-pill status-available"><span />Available</span></div></div><div className="detail-grid"><div><span className="modal-label">DATE</span><strong>{fullDateLabel(date)}</strong></div><div><span className="modal-label">TIME</span><strong>{time} - {String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00</strong></div><div><span className="modal-label">DURATION</span><strong>60 minutes</strong></div></div><div className="modal-user"><UserRound size={16} /><span>{email}</span></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="primary-button" onClick={onConfirm} disabled={confirming} aria-busy={confirming}>{confirming ? 'Reserving…' : 'Confirm booking'} <Check size={16} /></button></div></section></div>
}

function ConfirmationPanel({ booking, onClose, onSchedule }: { booking: Booking; onClose: () => void; onSchedule: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="confirmation-panel" role="dialog" aria-modal="true" aria-labelledby="success-title"><button type="button" className="modal-close" onClick={onClose} aria-label="Close booking confirmation"><X size={19} /></button><div className="success-icon"><Check size={24} /></div><p className="eyebrow">RESERVATION COMPLETE</p><h2 id="success-title">Booking confirmed</h2><p className="confirmation-copy">Your court is reserved. Show this QR code when you arrive.</p><div className="confirmation-layout"><QRVisual /><div className="confirmation-details"><span className="booking-id">{booking.id}</span><strong>{booking.court}</strong><p>{booking.dateLabel}</p><p>{booking.time} · 60 minutes</p><p className="confirmation-email"><UserRound size={14} /> {booking.email}</p></div></div><button type="button" className="primary-button full-button" onClick={onSchedule}>View my schedule <ArrowRight size={16} /></button></section></div>
}

function BookingView({ email, onSchedule }: { email: string; onSchedule: () => void }) {
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('10:00')
  const [hasSearched, setHasSearched] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState<CourtData | null>(null)
  const [modal, setModal] = useState(false)
  const [confirmation, setConfirmation] = useState<Booking | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const { data, error: loadError, isLoading, mutate } = useSWR<BookingResponse>(`/api/bookings?date=${date}&startTime=${time}`, fetcher)
  const courtData = data?.courts ?? []
  const availableCount = courtData.filter((court) => court.status === 'available').length
  const search = () => { setHasSearched(true); setSelectedCourt(null); setError(''); void mutate() }
  const confirmBooking = async () => {
    if (!selectedCourt || confirming) return
    setError('')
    setConfirming(true)
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courtId: selectedCourt.id, date, startTime: time }) })
      const result = await response.json()
      if (!response.ok) { setModal(false); setSelectedCourt(null); setError(result.error || 'Booking failed. Please try again.'); void mutate(); return }
      setModal(false)
      setSelectedCourt(null)
      setConfirmation(mapBooking(result.booking, email))
      void mutate()
    } catch {
      setModal(false)
      setSelectedCourt(null)
      setError('We could not reach the booking service. Please try again.')
    } finally {
      setConfirming(false)
    }
  }
  return <>
    <header className="page-header"><div><p className="eyebrow">COURT BOOKING</p><h1>Court availability dashboard</h1><p>Check court availability and reserve a court.</p></div><button type="button" className="help-button"><CircleHelp size={17} /> Need help?</button></header>
    <section className="search-card"><div className="search-card-heading"><div className="section-icon"><Search size={18} /></div><div><h2>Find a court</h2><p>Choose a date and one-hour slot to see what is available.</p></div></div><div className="search-fields"><div className="select-field"><label htmlFor="booking-date">Booking date</label><div className="select-wrap"><CalendarDays size={16} /><select id="booking-date" value={date} onChange={(event) => { setDate(event.target.value); setHasSearched(false); setSelectedCourt(null) }}><option value={today}>{dateLabel(today)}</option><option value={tomorrow}>{dateLabel(tomorrow)}</option></select><ChevronDown size={15} /></div></div><div className="select-field"><label htmlFor="booking-time">Start time</label><div className="select-wrap"><Clock3 size={16} /><select id="booking-time" value={time} onChange={(event) => { setTime(event.target.value); setHasSearched(false); setSelectedCourt(null) }}>{times.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select><ChevronDown size={15} /></div></div><div className="end-time"><label>End time</label><strong>{String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00</strong><span>60 min slot</span></div><button type="button" className="primary-button search-button" onClick={search} disabled={isLoading} aria-busy={isLoading}><Search size={16} /> {isLoading ? 'Checking courts…' : 'Search courts'}</button></div><div className="availability-note"><span className="live-dot" /> Booking hours today: <strong>06:00 - 21:00</strong><span className="note-divider" /> You can book today or tomorrow</div></section>
    {(error || loadError) && <p className="form-error" role="alert">{error || 'We could not load court availability right now.'}</p>}
    {hasSearched && isLoading && <section className="loading-state" aria-live="polite"><span className="loading-spinner" aria-hidden="true" /><strong>Checking court availability</strong><p>We&apos;re looking for open courts for your selected slot.</p></section>}
    {hasSearched && !isLoading && <><div className="summary-row"><SummaryCard icon={Dumbbell} label="Total courts" value={courtData.length} accent="coral" /><SummaryCard icon={Check} label="Available" value={availableCount} accent="emerald" /><SummaryCard icon={Users} label="Booked" value={courtData.filter((court) => court.status === 'booked').length} accent="rose" /><SummaryCard icon={ShieldCheck} label="Maintenance" value={courtData.filter((court) => court.status === 'maintenance').length} accent="gray" /></div><section className="courts-section"><div className="section-heading"><div><h2>Available courts</h2><p>{availableCount > 0 ? `${availableCount} courts available for ${dateLabel(date)} at ${time}.` : 'No courts are available for this time slot.'}</p></div><div className="legend"><span><i className="legend-available" /> Available</span><span><i className="legend-booked" /> Booked</span><span><i className="legend-maintenance" /> Maintenance</span></div></div><div className="courts-grid">{courtData.map((court) => <CourtCard key={court.id} court={court.name} status={selectedCourt?.id === court.id ? 'available' : court.status} selected={selectedCourt?.id === court.id} onSelect={() => { setSelectedCourt(court); setModal(true) }} />)}</div></section></>}
    {modal && selectedCourt && <BookingModal court={selectedCourt.name} date={date} time={time} email={email} confirming={confirming} onClose={() => { if (!confirming) setModal(false) }} onConfirm={confirmBooking} />}
    {confirmation && <ConfirmationPanel booking={confirmation} onClose={() => setConfirmation(null)} onSchedule={() => { setConfirmation(null); onSchedule() }} />}
  </>
}

function BookingItem({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  return <article className="booking-item"><div className="booking-item-main"><div className="booking-date-block"><span>{booking.dateLabel.split(' ')[0]}</span><strong>{booking.dateLabel.split(' ')[1]}</strong></div><div className="booking-item-info"><div className="booking-item-title"><strong>{booking.court}</strong><span className={`booking-status booking-status-${booking.status}`}>{booking.status === 'in-use' ? 'In use' : booking.status}</span></div><p>{booking.dateLabel} · {booking.time}</p><span className="booking-item-id">{booking.id}</span></div></div><div className="booking-item-actions"><QRVisual /><div>{booking.status === 'upcoming' ? <button type="button" className="cancel-button" onClick={onCancel}>Cancel booking</button> : <span className="completed-label">{booking.status === 'completed' ? 'Completed' : 'Currently in use'}</span>}</div></div></article>
}

function ScheduleView({ email }: { email: string }) {
  const [tab, setTab] = useState<ScheduleTab>('upcoming')
  const [cancelId, setCancelId] = useState('')
  const [error, setError] = useState('')
  const { data, error: loadError, mutate } = useSWR<BookingResponse>('/api/bookings', fetcher)
  const bookings = (data?.bookings ?? []).filter((booking) => booking.status !== 'cancelled').map((booking) => mapBooking(booking, email))
  const filtered = bookings.filter((booking) => booking.status === tab)
  const upcomingCount = bookings.filter((booking) => booking.status === 'upcoming').length
  const cancel = async () => {
    const response = await fetch('/api/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: cancelId }) })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Could not cancel booking.')
    else { setCancelId(''); setError(''); void mutate() }
  }
  return <><header className="page-header"><div><p className="eyebrow">YOUR RESERVATIONS</p><h1>My schedule</h1><p>Keep track of your court time and booking confirmations.</p></div><div className="schedule-count"><strong>{upcomingCount}</strong><span>upcoming bookings</span></div></header><section className="schedule-card"><div className="schedule-tabs" role="tablist" aria-label="Booking status"><button type="button" className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming <span>{upcomingCount}</span></button><button type="button" className={tab === 'in-use' ? 'active' : ''} onClick={() => setTab('in-use')}>In use</button><button type="button" className={tab === 'completed' ? 'active' : ''} onClick={() => setTab('completed')}>Completed</button></div>{(error || loadError) && <p className="form-error" role="alert">{error || 'We could not load your schedule right now.'}</p>}<div className="schedule-list">{filtered.length ? filtered.map((booking) => <BookingItem key={booking.id} booking={booking} onCancel={() => setCancelId(booking.id)} />) : <div className="empty-state"><CalendarDays size={25} /><strong>No {tab === 'upcoming' ? 'upcoming' : tab} bookings</strong><p>Your reservations will appear here.</p></div>}</div></section>{cancelId && <div className="modal-backdrop"><section className="small-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title"><div className="warning-icon"><X size={20} /></div><h2 id="cancel-title">Cancel this booking?</h2><p>Are you sure you want to cancel this booking? This action cannot be undone.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCancelId('')}>Keep booking</button><button type="button" className="danger-button" onClick={cancel}>Cancel booking</button></div></section></div>}</>
}

type AdminData = { courts: Array<{ id: string; name: string; status: string }>; bookings: Array<{ id: string; booking_date: string; start_time: string; end_time: string; status: string; court: string; user_name: string; user_email: string }>; users: Array<{ id: string; name: string; email: string; role: string }> }

function AdminDashboard() {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const { data, mutate } = useSWR<AdminData>('/api/admin', jsonFetcher)
  const updateCourt = async (courtId: string, status: 'available' | 'maintenance') => {
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'court-status', courtId, status }) })
    if (!response.ok) { setError('Only admins can update court status.'); return }
    setError(''); void mutate()
  }
  const cancelBooking = async (bookingId: string) => {
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel-booking', bookingId }) })
    if (!response.ok) { setError('That booking could not be cancelled.'); return }
    setError(''); void mutate()
  }
  const bookings = (data?.bookings ?? []).filter((booking) => `${booking.court} ${booking.user_name} ${booking.user_email} ${booking.id}`.toLowerCase().includes(query.toLowerCase()))
  return <><header className="page-header"><div><p className="eyebrow">ADMINISTRATION</p><h1>Admin dashboard</h1><p>Manage court availability and review all university reservations.</p></div></header>{error && <p className="form-error" role="alert">{error}</p>}<section className="summary-row"><SummaryCard icon={Dumbbell} label="Courts" value={data?.courts.length ?? 4} accent="coral" /><SummaryCard icon={Users} label="Users" value={data?.users.length ?? 0} accent="emerald" /><SummaryCard icon={CalendarDays} label="Bookings" value={data?.bookings.length ?? 0} accent="rose" /><SummaryCard icon={ShieldCheck} label="Maintenance" value={(data?.courts ?? []).filter((court) => court.status === 'maintenance').length} accent="gray" /></section><section className="schedule-card admin-card"><div className="section-heading"><div><h2>Court status</h2><p>Maintenance changes are enforced by the booking API.</p></div></div><div className="admin-courts">{(data?.courts ?? []).map((court) => <div className="admin-court-row" key={court.id}><div><strong>{court.name}</strong><span className={`status-pill status-${court.status === 'maintenance' ? 'maintenance' : 'available'}`}><span />{court.status === 'maintenance' ? 'Maintenance' : 'Available'}</span></div><button type="button" className="secondary-button" onClick={() => void updateCourt(court.id, court.status === 'maintenance' ? 'available' : 'maintenance')}>{court.status === 'maintenance' ? 'Return to available' : 'Set maintenance'}</button></div>)}</div></section><section className="schedule-card admin-card"><div className="section-heading"><div><h2>All bookings</h2><p>Search by court, student, email, or booking ID.</p></div><input className="admin-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" /></div><div className="admin-bookings">{bookings.length ? bookings.map((booking) => <div className="admin-booking-row" key={booking.id}><div><strong>{booking.court}</strong><span>{booking.user_name} · {booking.user_email}</span></div><div><strong>{booking.booking_date.slice(0, 10)} · {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}</strong><span>{booking.status}</span></div>{booking.status === 'upcoming' && <button type="button" className="cancel-button" onClick={() => void cancelBooking(booking.id)}>Cancel</button>}</div>) : <div className="empty-state"><CalendarDays size={25} /><strong>No matching bookings</strong><p>Bookings will appear here.</p></div>}</div></section></>
}

function SettingsView({ email, role, onLogout }: { email: string; role: string; onLogout: () => void }) {
  const [notifications, setNotifications] = useState(true)
  return <><header className="page-header"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p>Manage your account and booking preferences.</p></div></header><section className="settings-card"><div className="settings-row settings-profile"><div className="settings-avatar">{email.charAt(0).toUpperCase()}</div><div><span className="modal-label">SIGNED IN AS</span><strong>{email}</strong><p>{role === 'admin' ? 'Administrator account' : 'Student account'} · Secure account</p></div></div><div className="settings-row"><div><strong>Language</strong><p>Choose the language for your booking experience.</p></div><div className="segmented-control"><button className="active" type="button">EN</button><button type="button">TH</button></div></div><div className="settings-row"><div><strong>Booking notifications</strong><p>Receive reminders about your upcoming court reservations.</p></div><button type="button" className={`toggle ${notifications ? 'on' : ''}`} onClick={() => setNotifications(!notifications)} aria-label="Toggle booking notifications"><span /></button></div><div className="settings-row settings-danger"><div><strong>Sign out of this session</strong><p>Your mock bookings will no longer be visible after signing out.</p></div><button type="button" className="secondary-button" onClick={onLogout}><LogOut size={15} /> Log out</button></div></section></>
}

export default function Page() {
  const [view, setView] = useState<View>('booking')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, isPending } = useSession()
  const { data: profile } = useSWR<{ user: { name: string; email: string; role: string } }>('/api/me', jsonFetcher, { revalidateOnFocus: false })
  if (isPending) return <main className="login-page"><section className="login-card"><div className="brand-lockup"><div className="brand-icon"><BasketballMark small /></div><div><strong>Court Booking</strong><span>University Sports Center</span></div></div><p>Loading your secure session…</p></section></main>
  if (!session?.user) return <LoginScreen />
  const email = session.user.email
  const isAdmin = profile?.user.role === 'admin'
  const logout = async () => { await signOut(); setView('booking'); setMobileOpen(false) }
  return <div className="app-shell"><Sidebar email={email} isAdmin={isAdmin} view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={() => void logout()} /><main className={`app-main ${collapsed ? 'main-expanded' : ''}`}><div className="mobile-header"><button type="button" className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="mobile-brand"><BasketballMark small /><strong>Court Booking</strong></div><button type="button" className="avatar avatar-small" onClick={() => setView('settings')} aria-label="Open settings">{email.charAt(0).toUpperCase()}</button></div><div className="content-wrap">{view === 'booking' && <BookingView email={email} onSchedule={() => setView('schedule')} />}{view === 'schedule' && <ScheduleView email={email} />}{view === 'admin' && isAdmin && <AdminDashboard />}{view === 'settings' && <SettingsView email={email} role={profile?.user.role ?? 'student'} onLogout={() => void logout()} />}</div></main></div>
}
