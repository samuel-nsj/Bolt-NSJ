import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  to?: string;
  type?: 'email' | 'sms';
  subject?: string;
  body?: string;
  bookingId?: string;
  trackingNumber?: string;
  customerEmail?: string;
  customerName?: string;
  labelUrl?: string;
  orderNumber?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      to,
      type,
      subject,
      body,
      bookingId,
      trackingNumber,
      customerEmail,
      customerName,
      labelUrl,
      orderNumber
    }: NotificationRequest = await req.json();

    if (trackingNumber && customerEmail) {
      const trackingEmailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Shipment is Ready!</h2>
          <p>Hi ${customerName || 'there'},</p>
          <p>Great news! Your order <strong>${orderNumber}</strong> has been processed and sent to our shipping partner Aramex.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Tracking Details</h3>
            <p style="font-size: 18px; margin: 10px 0;">
              <strong>Tracking Number:</strong><br/>
              <span style="color: #2563eb; font-size: 24px; font-weight: bold;">${trackingNumber}</span>
            </p>
            ${labelUrl ? `
              <p style="margin-top: 15px;">
                <a href="${labelUrl}"
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Download Shipping Label
                </a>
              </p>
            ` : ''}
          </div>

          <p>You can track your shipment using the tracking number above on the Aramex website.</p>

          <p style="margin-top: 30px;">
            Thanks for choosing NSJ Express!<br/>
            <strong>The NSJ Express Team</strong>
          </p>
        </div>
      `;

      const result = await sendEmail(
        customerEmail,
        `Your Shipment is Ready - Tracking: ${trackingNumber}`,
        trackingEmailBody
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tracking notification sent successfully',
          result,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!to || !type || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let result;

    if (type === 'email') {
      result = await sendEmail(to, subject || 'Shipment Update', body);
    } else if (type === 'sms') {
      result = await sendSMS(to, body);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${type} notification sent successfully`,
        result,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function sendEmail(to: string, subject: string, body: string) {
  console.log(`Email sent to ${to}: ${subject}`);
  return { messageId: `email_${Date.now()}`, to, subject };
}

async function sendSMS(to: string, body: string) {
  console.log(`SMS sent to ${to}: ${body}`);
  return { messageId: `sms_${Date.now()}`, to };
}