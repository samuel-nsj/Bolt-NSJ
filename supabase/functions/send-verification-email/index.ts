import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  email: string;
  userId: string;
  confirmationUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, userId, confirmationUrl }: EmailRequest = await req.json();

    if (!email || !confirmationUrl) {
      return new Response(
        JSON.stringify({ error: "Email and confirmation URL are required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create the email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - NSJ Express</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">NSJ Express</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">Fast & Reliable Shipping</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 26px; font-weight: 600;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for signing up with NSJ Express! We're excited to help you ship faster and more efficiently.
              </p>
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                To get started, please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; color: #2563eb; font-size: 13px; word-break: break-all;">
                ${confirmationUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>What's next?</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Book your first shipment in minutes</li>
                <li>Track all your deliveries in one place</li>
                <li>Get competitive rates from trusted carriers</li>
                <li>Access your shipping dashboard 24/7</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">
                This email was sent by NSJ Express. If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} NSJ Express. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Questions? Contact us at <a href="mailto:support@nsjexpress.com" style="color: #2563eb; text-decoration: none;">support@nsjexpress.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailText = `
NSJ Express - Verify Your Email Address

Thank you for signing up with NSJ Express! We're excited to help you ship faster and more efficiently.

To get started, please verify your email address by visiting this link:
${confirmationUrl}

What's next?
- Book your first shipment in minutes
- Track all your deliveries in one place
- Get competitive rates from trusted carriers
- Access your shipping dashboard 24/7

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} NSJ Express. All rights reserved.
Questions? Contact us at support@nsjexpress.com
    `;

    // In a production environment, you would use a service like SendGrid, Resend, or AWS SES
    // For now, we'll log the email (you'll need to configure an actual email service)
    console.log('Sending verification email to:', email);
    console.log('Confirmation URL:', confirmationUrl);

    // TODO: Replace this with actual email sending service
    // Example with Resend:
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'NSJ Express <noreply@nsjexpress.com>',
    //     to: email,
    //     subject: 'Verify Your Email - NSJ Express',
    //     html: emailHtml,
    //     text: emailText,
    //   }),
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email sent successfully',
        email: email,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send verification email',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
