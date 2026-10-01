import { Resend } from 'resend'

type BookingConfirmation = {
  userName: string
  email: string
  court: string
  date: string
  startTime: string
  endTime: string
  bookingId: string
}


export async function sendBookingConfirmation(booking: BookingConfirmation) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return { status: 'not_configured' as const }
  }

  const resend = new Resend(apiKey)


  try {
    const { data, error } = await resend.emails.send({
      from: 'Basketball Court Booking <onboarding@resend.dev>',
      to: [booking.email],
      subject: `Court booking confirmed: ${booking.bookingId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
          <h1>Booking confirmed</h1>

          <p>Hello ${booking.userName},</p>

          <p>Your basketball court booking has been confirmed.</p>

          <hr />

          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Court:</strong> ${booking.court}</p>
          <p><strong>Date:</strong> ${booking.date}</p>
          <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>

          <hr />

          <p>Thank you for using Basketball Court Booking.</p>
        </div>
      `,
    })

    if (error) {
      console.error('[v0] Booking confirmation email failed:', error)
      return { status: 'failed' as const }
    }

    return {
      status: 'sent' as const,
      id: data?.id,
    }
  } catch (error) {
    console.error(
      '[v0] Booking confirmation email failed:',
      error instanceof Error ? error.message : 'unknown error',
    )

    return { status: 'failed' as const }
  }
}
