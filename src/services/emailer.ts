import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

interface ChangeAlert {
  competitorName: string;
  competitorUrl: string;
  field: string;
  oldValue: string;
  newValue: string;
  reportUrl: string;
}

export async function sendChangeAlert(
  to: string,
  alert: ChangeAlert
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResend();
    
    await resendClient.emails.send({
      from: 'Competitor Monitor <alerts@competitor-monitor.com>',
      to,
      subject: `${alert.competitorName} changed their ${alert.field}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .change { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .old { text-decoration: line-through; color: #6b7280; }
    .new { color: #10b981; font-weight: bold; }
    .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Competitor Changed</h1>
      <p>${alert.competitorName} updated their ${alert.field}</p>
    </div>
    <div class="content">
      <div class="change">
        <p><strong>What changed:</strong></p>
        <p class="old">${alert.oldValue}</p>
        <p class="new">${alert.newValue}</p>
      </div>
      <p><a href="${alert.reportUrl}" class="button">View Full Report</a></p>
    </div>
  </div>
</body>
</html>
      `,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function sendWaitlistConfirmation(
  to: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResend();
    
    await resendClient.emails.send({
      from: 'Competitor Monitor <hello@competitor-monitor.com>',
      to,
      subject: "You're on the list! 🎉",
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're on the list! 🎉</h1>
      <p>Thanks for signing up for Competitor Monitor early access.</p>
    </div>
    <p>We'll email you when we're ready to launch. In the meantime, follow us for updates!</p>
    <p>— The Competitor Monitor Team</p>
  </div>
</body>
</html>
      `,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send waitlist email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
