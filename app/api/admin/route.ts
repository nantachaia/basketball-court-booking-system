import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

async function requireAdmin() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { session: null, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) }
    const result = await pool.query('SELECT id, name, email, role FROM public."user" WHERE id = $1 LIMIT 1', [session.user.id])
    const user = result.rows[0]
    if (user?.role !== 'admin') return { session: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }
    return { session, user, response: null }
  } catch (error) {
    console.error('[v0] Failed to verify admin access:', error instanceof Error ? error.message : 'unknown error')
    return { session: null, response: NextResponse.json({ error: 'We could not verify admin access right now.' }, { status: 500 }) }
  }
}

export async function GET() {
  const access = await requireAdmin()
  if (access.response) return access.response
  try {
    const [courts, bookings, users] = await Promise.all([
      pool.query('SELECT id, name, status FROM public.courts ORDER BY CASE WHEN name = $1 THEN 0 ELSE 1 END, name', ['Main Court']),
      pool.query(`SELECT b.id, b.booking_date, b.start_time, b.end_time, b.status, c.name AS court, u.name AS user_name, u.email AS user_email FROM public.bookings b JOIN public.courts c ON c.id = b.court_id JOIN public.users u ON u.id = b.user_id ORDER BY b.booking_date DESC, b.start_time DESC`),
      pool.query('SELECT id, name, email, role, "createdAt" FROM public."user" ORDER BY "createdAt" DESC'),
    ])
    return NextResponse.json({ courts: courts.rows, bookings: bookings.rows, users: users.rows })
  } catch (error) {
    console.error('[v0] Failed to load admin data:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'We could not load admin data right now.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdmin()
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const action = typeof body?.action === 'string' ? body.action : ''
  try {
    if (action === 'court-status') {
      const courtId = typeof body?.courtId === 'string' ? body.courtId : ''
      const status = body?.status === 'maintenance' ? 'maintenance' : body?.status === 'available' ? 'available' : ''
      if (!courtId || !status) return NextResponse.json({ error: 'Invalid court status.' }, { status: 400 })
      const result = await pool.query('UPDATE public.courts SET status = $1 WHERE id = $2 RETURNING id, name, status', [status, courtId])
      if (!result.rows.length) return NextResponse.json({ error: 'Court not found.' }, { status: 404 })
      return NextResponse.json({ court: result.rows[0] })
    }
    if (action === 'cancel-booking') {
      const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : ''
      if (!bookingId) return NextResponse.json({ error: 'Booking ID is required.' }, { status: 400 })
      const result = await pool.query("UPDATE public.bookings SET status = 'cancelled' WHERE id = $1 AND status = 'upcoming' RETURNING id", [bookingId])
      if (!result.rows.length) return NextResponse.json({ error: 'This booking cannot be cancelled.' }, { status: 409 })
      return NextResponse.json({ ok: true, bookingId })
    }
    return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 })
  } catch (error) {
    console.error('[v0] Failed to update admin data:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'We could not update that admin record right now.' }, { status: 500 })
  }
}
