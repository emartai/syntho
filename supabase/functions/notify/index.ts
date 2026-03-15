// Supabase Edge Function: notify
// Handles all notification events: job_complete, purchase_made, sale_made, job_failed, system

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotificationPayload {
  user_id: string
  type: 'job_complete' | 'purchase_made' | 'sale_made' | 'job_failed' | 'system'
  data: Record<string, string>
}

interface EmailPayload {
  to: string
  subject: string
  html: string
}

serve(async (req: Request) => {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: NotificationPayload = await req.json()
    const { user_id, type, data } = payload

    if (!user_id || !type || !data) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    // Get user email for email notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Build notification based on type
    let title = ''
    let message = ''
    let link = ''

    switch (type) {
      case 'job_complete':
        title = 'Dataset Ready!'
        message = `Your synthetic dataset "${data.name}" is ready for download.`
        link = `/datasets/${data.dataset_id}`
        break

      case 'purchase_made':
        title = 'Purchase Complete'
        message = `You purchased "${data.listing_title}" for ₦${data.amount}.`
        link = `/datasets/${data.dataset_id}`
        break

      case 'sale_made':
        title = 'New Sale!'
        message = `Someone purchased your dataset "${data.title}" — ₦${data.net_amount} incoming.`
        link = `/sell/manage`
        break

      case 'job_failed':
        title = 'Generation Failed'
        message = `Generation failed for "${data.name}" — please try again or contact support.`
        link = `/datasets/${data.dataset_id}`
        break

      case 'system':
        title = data.title || 'System Notification'
        message = data.message || ''
        link = data.link || '/dashboard'
        break

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), { status: 400 })
    }

    // Insert notification into database
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        link,
        read: false
      })

    if (dbError) {
      console.error('Failed to insert notification:', dbError)
      return new Response(JSON.stringify({ error: 'Failed to create notification' }), { status: 500 })
    }

    // Send email notification (using Supabase Auth email or Resend)
    const emailSent = await sendEmail(supabase, {
      to: profile.email,
      subject: `[Syntho] ${title}`,
      html: getEmailTemplate({ title, message, link, userName: profile.full_name })
    })

    return new Response(JSON.stringify({ 
      success: true, 
      notification: { type, title, message, link },
      emailSent 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Notification error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})

async function sendEmail(supabase: any, email: EmailPayload): Promise<boolean> {
  // Try using Supabase Auth's built-in email first
  // If not configured, log the email (in production, integrate with Resend/SendGrid)
  
  try {
    // Option 1: Use Supabase Auth (if configured with custom email provider)
    // This requires setting up email provider in Supabase dashboard
    
    // Option 2: Log email for development (replace with Resend in production)
    console.log('📧 Email would be sent:', email)
    
    // For production, uncomment below to use Resend:
    // const resendApiKey = Deno.env.get('RESEND_API_KEY')
    // if (resendApiKey) {
    //   const response = await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Bearer ${resendApiKey}`,
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       from: 'Syntho <notifications@syntho.app>',
    //       to: email.to,
    //       subject: email.subject,
    //       html: email.html
    //     })
    //   })
    //   return response.ok
    // }
    
    return false // Email not actually sent in development
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}

function getEmailTemplate({ title, message, link, userName }: { title: string; message: string; link: string; userName?: string | null }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05030f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background: linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Syntho</h1>
      </td>
    </tr>
    <tr>
      <td style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(167, 139, 250, 0.10); border-top: none; padding: 30px;">
        <p style="color: rgba(241, 240, 255, 0.65); font-size: 14px; margin: 0 0 20px 0;">
          ${userName ? `Hi ${userName},` : 'Hello,'}
        </p>
        <h2 style="color: #f1f0ff; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
          ${title}
        </h2>
        <p style="color: rgba(241, 240, 255, 0.80); font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          ${message}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); border-radius: 8px; padding: 12px 24px;">
              <a href="${link.startsWith('http') ? link : `https://syntho.app${link}`}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
                View in Dashboard →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center;">
        <p style="color: rgba(241, 240, 255, 0.38); font-size: 12px; margin: 0;">
          © 2025 Syntho. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
}