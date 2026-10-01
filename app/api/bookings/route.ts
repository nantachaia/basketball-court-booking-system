import { NextRequest, NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { sendBookingConfirmation } from '@/lib/booking-email'
import { pool } from '@/lib/db'
import { isAllowedBookingDate } from '@/lib/booking-time'

const SLOT_PATTERN = /^(0[6-9]|1[0-9]|20):00$/

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function validDate(value: string) {
  return isAllowedBookingDate(value)
}

type IdentityResult =
  | { identity: { session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>; profile: { id: string; name: string; email: string } }; error: null }
  | { identity: null; error: 'unauthenticated' | 'unavailable' }

async function getIdentity(): Promise<IdentityResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return { identity: null, error: 'unauthenticated' }
    }

    const profile = {
      id: session.user.id,
      name: session.user.name || session.user.email.split('@')[0],
      email: session.user.email.toLowerCase(),
    }

    return {
      identity: {
        session,
        profile,
      },
      error: null,
    }
  } catch (error) {
    console.error(
      '[v0] Failed to resolve booking identity:',
      error instanceof Error ? error.message : 'unknown error',
    )

    return {
      identity: null,
      error: 'unavailable',
    }
  }
}

function identityResponse(result: IdentityResult) {
  return result.error === 'unauthenticated'
    ? jsonError('Authentication required.', 401)
    : jsonError('We could not verify your account right now.', 500)
}

export async function GET(request: NextRequest) {
  const identityResult = await getIdentity()
  if (!identityResult.identity) return identityResponse(identityResult)
  const identity = identityResult.identity
  const params = request.nextUrl.searchParams
  const date = params.get('date')
  const startTime = params.get('startTime')

  try {
    const courtsResult = await pool.query('SELECT id, name, status FROM public.courts ORDER BY CASE WHEN name = $1 THEN 0 ELSE 1 END, name', ['Main Court'])
    if (date && startTime) {
      if (!validDate(date) || !SLOT_PATTERN.test(startTime)) return jsonError('Choose a valid booking date and time.')
      const bookingsResult = await pool.query(
        `SELECT b.id, b.court_id, c.name AS court, b.booking_date, b.start_time, b.end_time, b.duration, b.status
         FROM public.bookings b JOIN public.courts c ON c.id = b.court_id
         WHERE b.booking_date = $1 AND b.start_time < ($2::time + interval '1 hour') AND b.end_time > $2::time AND b.status <> 'cancelled'`,
        [date, startTime],
      )
      const bookedCourtIds = new Set(bookingsResult.rows.map((row) => row.court_id))
      return NextResponse.json({
        courts: courtsResult.rows.map((court) => ({ ...court, status: court.status === 'maintenance' ? 'maintenance' : bookedCourtIds.has(court.id) ? 'booked' : 'available' })),
        bookings: bookingsResult.rows,
      })
    }
    const bookingsResult = await pool.query(
  `SELECT b.id, b.court_id, c.name AS court, b.booking_date::text AS booking_date, b.start_time, b.end_time, b.duration, b.status
   FROM public.bookings b JOIN public.courts c ON c.id = b.court_id WHERE b.user_id = $1 ORDER BY b.booking_date DESC, b.start_time DESC`,
  [identity.profile.id],
)
    return NextResponse.json({ courts: courtsResult.rows, bookings: bookingsResult.rows })
  } catch (error) {
    console.error('[v0] Failed to load bookings:', error instanceof Error ? error.message : 'unknown error')
    return jsonError('We could not load booking data right now.', 500)
  }
}

export async function POST(request: NextRequest) {
  const identityResult = await getIdentity()
  if (!identityResult.identity) return identityResponse(identityResult)
  const identity = identityResult.identity
  const body = await request.json().catch(() => null)
  const courtId = typeof body?.courtId === 'string' ? body.courtId : ''
  const date = typeof body?.date === 'string' ? body.date : ''
  const startTime = typeof body?.startTime === 'string' ? body.startTime : ''
  if (!courtId || !validDate(date) || !SLOT_PATTERN.test(startTime)) return jsonError('Please choose a valid court, date, and time.')

  let client: PoolClient | undefined
  try {
    const transactionClient = await pool.connect()
    client = transactionClient
    await transactionClient.query('BEGIN')
    const courtResult = await transactionClient.query('SELECT id, name, status FROM public.courts WHERE id = $1 FOR UPDATE', [courtId])
    const court = courtResult.rows[0]
    if (!court || court.status === 'maintenance') {
      await transactionClient.query('ROLLBACK')
      return jsonError('This court is not available for booking.')
    }
    const conflict = await transactionClient.query(
      `SELECT id FROM public.bookings WHERE court_id = $1 AND booking_date = $2 AND start_time < ($3::time + interval '1 hour') AND end_time > $3::time AND status <> 'cancelled' LIMIT 1`,
      [courtId, date, startTime],
    )
    if (conflict.rows.length) {
      await transactionClient.query('ROLLBACK')
      return jsonError('This court has just been booked. Please choose another time.', 409)
    }
    const endTime = `${String(Number(startTime.slice(0, 2)) + 1).padStart(2, '0')}:00`
    const bookingId = `BK-${date.replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const bookingResult = await transactionClient.query(
      `INSERT INTO public.bookings (id, user_id, court_id, booking_date, start_time, end_time, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, 60, 'upcoming')
       RETURNING id, court_id, booking_date, start_time, end_time, duration, status`,
      [bookingId, identity.profile.id, courtId, date, startTime, endTime],
    )
    await transactionClient.query('COMMIT')
    const booking = { ...bookingResult.rows[0], court: court.name, email: identity.profile.email, userName: identity.profile.name }
    const emailDelivery = await sendBookingConfirmation({ userName: identity.profile.name, email: identity.profile.email, court: court.name, date, startTime, endTime, bookingId })
    console.log('[v0] Email delivery result:', emailDelivery)
    return NextResponse.json({ booking: { ...booking, emailDelivery: emailDelivery.status } }, { status: 201 })
  } catch (error: unknown) {
    await client?.query('ROLLBACK').catch(() => undefined)
    if ((error as { code?: string })?.code === '23505') return jsonError('This court has just been booked. Please choose another time.', 409)
    console.error('[v0] Failed to create booking:', error instanceof Error ? error.message : 'unknown error')
    return jsonError('We could not create that booking right now.', 500)
  } finally {
    client?.release()
  }
}

export async function PATCH(request: NextRequest) {
  const identityResult = await getIdentity()
  if (!identityResult.identity) return identityResponse(identityResult)
  const identity = identityResult.identity
  const body = await request.json().catch(() => null)
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : ''
  if (!bookingId) return jsonError('Invalid cancellation request.')
  try {
    const result = await pool.query(
      `UPDATE public.bookings SET status = 'cancelled' WHERE id = $1 AND user_id = $2 AND status = 'upcoming' RETURNING id`,
      [bookingId, identity.profile.id],
    )
    if (!result.rows.length) return jsonError('This booking cannot be cancelled.', 409)
    return NextResponse.json({ ok: true, bookingId })
  } catch (error) {
    console.error('[v0] Failed to cancel booking:', error instanceof Error ? error.message : 'unknown error')
    return jsonError('We could not cancel that booking right now.', 500)
  }
}
