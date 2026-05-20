import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

const app = express()
const PORT = isProd ? (process.env.PORT || 5000) : 3001

app.use(cors())
app.use(express.json())

// Serve built frontend in production
if (isProd) {
  const distPath = join(__dirname, '../dist')
  if (existsSync(distPath)) {
    app.use(express.static(distPath))
  }
}

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Proquoment <onboarding@resend.dev>'

app.post('/api/send-forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const resetLink = `${req.headers.origin || 'https://proquoment.app'}/login`

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Reset your Proquoment password',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f00da 0%,#2d2dff 100%);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;line-height:32px;text-align:center;font-size:18px;color:white;">✈</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.3px;">Proquoment</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111111;letter-spacing:-0.3px;">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.6;">
              We received a request to reset the password for your Proquoment account associated with <strong>${email}</strong>.
              Click the button below to choose a new password.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                <td align="center" style="border-radius:12px;background:#0f00da;">
                  <a href="${resetLink}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
                    Reset password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#9e9e9e;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
            </p>
            <p style="margin:0;font-size:13px;color:#9e9e9e;">This link expires in <strong>24 hours</strong>.</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bdbdbd;">
              &copy; 2025 Proquoment · Supplier & Manufacturer Portal
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-forgot-password error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

app.post('/api/send-quote-confirmation', async (req, res) => {
  const { email, name, rfq, bidRef } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `Quote submitted — ${rfq?.title || 'RFQ'}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f00da 0%,#2d2dff 100%);padding:32px 40px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;line-height:32px;text-align:center;font-size:18px;color:white;">✈</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:#ffffff;font-size:18px;font-weight:600;">Proquoment</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Success banner -->
        <tr>
          <td style="background:#f0f1ff;padding:20px 40px;border-bottom:1px solid #e1e0ff;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:middle;">
                  <div style="width:36px;height:36px;background:#0f00da;border-radius:50%;text-align:center;line-height:36px;color:#fff;font-size:18px;">✓</div>
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:15px;font-weight:600;color:#0f00da;">Quote submitted successfully!</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#555555;">Reference: <strong>${bidRef || 'BID-' + Date.now()}</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
              Hi ${name || 'there'}, your quote has been submitted to the buyer. Here's a summary:
            </p>

            <!-- RFQ card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border:1px solid #f0f0f0;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#9e9e9e;text-transform:uppercase;letter-spacing:0.5px;">RFQ Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${[
                    ['Product', rfq?.title || 'Steel Pipes Grade A'],
                    ['Buyer', rfq?.buyer || 'Sunrise Manufacturing LLC'],
                    ['Quantity', rfq?.quantity || '500 units'],
                    ['Your Deadline', rfq?.deadline || 'Dec 15, 2024'],
                    ['Budget Range', rfq?.budget || '$12,000 – $18,000'],
                  ].map(([label, value]) => `
                  <tr>
                    <td style="padding:5px 0;font-size:13px;color:#9e9e9e;width:40%;">${label}</td>
                    <td style="padding:5px 0;font-size:13px;color:#111111;font-weight:500;">${value}</td>
                  </tr>`).join('')}
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:14px;color:#555555;line-height:1.6;">
              The buyer will review your quote within <strong>24 hours</strong>. You can track your bid status in the My Bids section of your dashboard.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bdbdbd;">&copy; 2025 Proquoment · Supplier & Manufacturer Portal</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-quote-confirmation error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

app.post('/api/send-test-notification', async (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [email],
      subject: 'Test notification from Proquoment',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <tr>
          <td style="background:linear-gradient(135deg,#0f00da 0%,#2d2dff 100%);padding:32px 40px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">
                  <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;line-height:32px;text-align:center;font-size:18px;color:white;">✈</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="color:#ffffff;font-size:18px;font-weight:600;">Proquoment</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111111;">Test notification</h1>
            <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6;">
              Hi ${name || 'there'}! This is a test notification confirming your email notifications are set up and working correctly for your Proquoment account.
            </p>
            <p style="margin:0;font-size:14px;color:#9e9e9e;line-height:1.6;">
              You'll receive emails like this when you have new RFQ matches, bid updates, or important account activity.
            </p>
          </td>
        </tr>

        <tr><td style="padding:0 40px;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bdbdbd;">&copy; 2025 Proquoment · Supplier & Manufacturer Portal</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-test-notification error:', err)
    res.status(500).json({ error: 'Failed to send email' })
  }
})

// SPA fallback — must be last, after all API routes
if (isProd) {
  const distPath = join(__dirname, '../dist')
  app.get('/{*path}', (req, res) => {
    const indexPath = join(distPath, 'index.html')
    if (existsSync(indexPath)) {
      res.sendFile(indexPath)
    } else {
      res.status(404).send('Not found')
    }
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proquoment API server running on port ${PORT} [${isProd ? 'production' : 'development'}]`)
})
