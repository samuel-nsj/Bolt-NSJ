# Email Verification Setup for NSJ Express

This document explains how the email verification system works and how to configure it for production.

## Current Setup

The application now includes a complete email verification system with NSJ Express branding:

### 1. **Edge Function: `send-verification-email`**
   - Located at: `supabase/functions/send-verification-email/`
   - Sends beautifully branded verification emails
   - Professional HTML template with NSJ Express styling
   - Includes company logo, colors, and branding

### 2. **Email Flow**
   When a user signs up:
   1. Account is created in Supabase Auth
   2. Custom verification email is sent via edge function
   3. User receives email from "NSJ Express" with verification link
   4. User clicks link and is redirected to `/auth/confirm`
   5. Email is verified and user is logged in automatically
   6. User is redirected to dashboard

### 3. **Email Template Features**
   - NSJ Express branded header with gradient
   - Clear call-to-action button
   - Professional styling with company colors (blue)
   - Fallback plain text link
   - "What's next" section explaining benefits
   - Footer with contact information

## Development vs Production

### Current State (Development)
- Email verification is enabled but emails are logged to console
- Users see the message: "Please check your email from NSJ Express"
- The email HTML is generated but not actually sent
- You need to configure an email service provider to send real emails

### For Production (Required Setup)

To send real emails, you need to choose and configure an email service provider:

#### Option 1: Resend (Recommended - Easy Setup)
```typescript
// In send-verification-email/index.ts, replace the TODO section with:
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'NSJ Express <noreply@nsjexpress.com>',
    to: email,
    subject: 'Verify Your Email - NSJ Express',
    html: emailHtml,
    text: emailText,
  }),
});
```

**Setup Steps:**
1. Sign up at https://resend.com
2. Verify your domain (nsjexpress.com)
3. Get your API key
4. Add to Supabase secrets: `RESEND_API_KEY`

#### Option 2: SendGrid
```typescript
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: 'noreply@nsjexpress.com', name: 'NSJ Express' },
    subject: 'Verify Your Email - NSJ Express',
    content: [
      { type: 'text/html', value: emailHtml },
      { type: 'text/plain', value: emailText },
    ],
  }),
});
```

#### Option 3: AWS SES
```typescript
// Use AWS SDK or SMTP credentials
```

#### Option 4: Mailgun
```typescript
const formData = new FormData();
formData.append('from', 'NSJ Express <noreply@nsjexpress.com>');
formData.append('to', email);
formData.append('subject', 'Verify Your Email - NSJ Express');
formData.append('html', emailHtml);
formData.append('text', emailText);

const response = await fetch(
  `https://api.mailgun.net/v3/${Deno.env.get('MAILGUN_DOMAIN')}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa('api:' + Deno.env.get('MAILGUN_API_KEY'))}`,
    },
    body: formData,
  }
);
```

## Email Configuration Checklist

- [ ] Choose email service provider (Resend, SendGrid, AWS SES, Mailgun)
- [ ] Sign up and verify your domain (nsjexpress.com)
- [ ] Get API credentials
- [ ] Add credentials to Supabase project secrets
- [ ] Update edge function code with actual email sending
- [ ] Test with a real email address
- [ ] Configure SPF, DKIM, and DMARC records for your domain
- [ ] Set up email monitoring and delivery tracking

## Testing

### Test in Development
1. Sign up with a new email
2. Check browser console for email content
3. Copy the verification URL from console
4. Paste in browser to test confirmation flow

### Test in Production
1. Configure email provider
2. Sign up with real email address
3. Check inbox for branded NSJ Express email
4. Click verification link
5. Verify successful login

## Domain Configuration

For production emails from "NSJ Express <noreply@nsjexpress.com>":

1. **DNS Records Required:**
   - SPF record: Prevents email spoofing
   - DKIM record: Email authentication
   - DMARC record: Email policy

2. **From Address:**
   - Use: `noreply@nsjexpress.com`
   - Or: `verify@nsjexpress.com`
   - Or: `hello@nsjexpress.com`

3. **Reply-To:**
   - Set to: `support@nsjexpress.com` for user responses

## Email Deliverability Tips

1. **Warm up your domain** - Start with low volume, gradually increase
2. **Monitor bounce rates** - Keep below 5%
3. **Handle unsubscribes** - Even though these are transactional
4. **Test spam scores** - Use mail-tester.com
5. **Authentication** - Ensure SPF, DKIM, DMARC are configured
6. **Content** - Avoid spam trigger words
7. **Engagement** - Monitor open/click rates

## Support

For questions about email setup:
- Email service provider documentation
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Contact: support@nsjexpress.com

## Cost Estimates

- **Resend:** Free tier: 3,000 emails/month, then $20/month for 50k emails
- **SendGrid:** Free tier: 100 emails/day, then $19.95/month for 50k emails
- **AWS SES:** $0.10 per 1,000 emails (very cost-effective at scale)
- **Mailgun:** Free tier: 5,000 emails/month, then $35/month for 50k emails

**Recommendation:** Start with Resend for ease of setup and generous free tier.
