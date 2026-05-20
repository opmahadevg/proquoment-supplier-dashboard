import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Proquoment <onboarding@resend.dev>'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, name, rfq, bidRef } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Quote submitted — ${rfq?.title || 'RFQ'}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#0f00da 0%,#2d2dff 100%);padding:32px 40px;"><span style="color:#ffffff;font-size:18px;font-weight:600;">Proquoment</span></td></tr><tr><td style="background:#f0f1ff;padding:20px 40px;border-bottom:1px solid #e1e0ff;"><p style="margin:0;font-size:15px;font-weight:600;color:#0f00da;">Quote submitted successfully!</p><p style="margin:4px 0 0;font-size:13px;color:#555555;">Reference: <strong>${bidRef || 'BID-' + Date.now()}</strong></p></td></tr><tr><td style="padding:32px 40px;"><p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">Hi ${name || 'there'}, your quote has been submitted to the buyer.</p></td></tr><tr><td style="padding:24px 40px;text-align:center;"><p style="margin:0;font-size:12px;color:#bdbdbd;">&copy; 2025 Proquoment</p></td></tr></table></td></tr></table></body></html>`,
    })
    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-quote-confirmation error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
}
