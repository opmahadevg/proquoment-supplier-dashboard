import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Proquoment <onboarding@resend.dev>'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const resetLink = `${req.headers.origin || 'https://proquoment.vercel.app'}/login`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Reset your Proquoment password',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#0f00da 0%,#2d2dff 100%);padding:32px 40px;text-align:center;"><span style="color:#ffffff;font-size:18px;font-weight:600;">Proquoment</span></td></tr><tr><td style="padding:40px 40px 32px;"><h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111111;">Reset your password</h1><p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.6;">We received a request to reset the password for <strong>${email}</strong>.</p><table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center" style="border-radius:12px;background:#0f00da;"><a href="${resetLink}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset password</a></td></tr></table><p style="margin:0;font-size:13px;color:#9e9e9e;">This link expires in <strong>24 hours</strong>.</p></td></tr><tr><td style="padding:24px 40px;text-align:center;"><p style="margin:0;font-size:12px;color:#bdbdbd;">&copy; 2025 Proquoment &middot; Supplier &amp; Manufacturer Portal</p></td></tr></table></td></tr></table></body></html>`,
    })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-forgot-password error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
}
