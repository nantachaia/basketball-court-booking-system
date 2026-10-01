import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ user: null }, { status: 401 })

    const result = await pool.query('SELECT id, name, email, role FROM public."user" WHERE id = $1 LIMIT 1', [session.user.id])
    const user = result.rows[0] ?? { id: session.user.id, name: session.user.name, email: session.user.email, role: 'student' }
    return NextResponse.json({ user })
  } catch (error) {
    console.error('[v0] Failed to load profile:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'We could not load your profile right now.' }, { status: 500 })
  }
}
