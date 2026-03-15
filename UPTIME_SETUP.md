# UptimeRobot Setup Guide

## Create Free UptimeRobot Account

1. Go to [uptimerobot.com](https://uptimerobot.com) and click "Sign Up Free"
2. Sign up with email or use Google/GitHub OAuth
3. Verify your email if required

## Add HTTP Monitor for Backend

1. After logging in, click "Add New Monitor" button
2. Configure the monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Syntho API - Production
   - **URL (or IP)**: `https://api.syntho.app/health`
   - **Monitoring Interval**: 5 minutes (300 seconds)
   - **Timeout**: 30 seconds
   - **HTTP Method**: GET

3. Click "Create Monitor"

## Set Up Alert Contacts

1. Go to "Alert Contacts" in the left sidebar
2. Click "Add New Alert Contact"
3. Add your email:
   - **Type**: Email
   - **Friendly Name**: Primary Alert Email
   - **Email**: your-email@example.com
4. Click "Create Alert Contact"

5. Go back to your monitor and click "Alert Contacts"
6. Select your alert contact and save

## Configure Alert Thresholds (Optional)

1. In monitor settings, configure:
   - **Downtime Alerts**: Alert after 2 failed checks (10 minutes)
   - **Uptime Alerts**: Alert when back online
   - **SSL Expiration**: Alert 30 days before expiry

## Alert Types Available

- **Email**: Free, unlimited
- **SMS**: Pay-per-use (not included in free plan)
- **Push Notification**: Free mobile app
- **Slack/Webhook**: Premium features

## Best Practices

1. Set monitoring interval to 5 minutes (minimum for free plan)
2. Use multiple alert contacts (email + mobile app)
3. Test alerts by intentionally causing downtime
4. Monitor both `/health` endpoint and a frontend page

## What to Monitor

| Monitor | URL | Purpose |
|---------|-----|---------|
| Backend API | `https://api.syntho.app/health` | API health check |
| Frontend | `https://syntho.app` | Frontend availability |

## Alert Response

When an alert is received:
1. Check Render dashboard for service status
2. Check Render logs for errors
3. Verify Supabase database is accessible
4. Check Modal.com for GPU availability
5. Review recent deployments