import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromSms = process.env.TWILIO_PHONE_NUMBER;
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured.');
  }
  return twilio(accountSid, authToken);
}

export async function sendSms(to, body) {
  if (!fromSms) throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  const client = getClient();
  return client.messages.create({ to, from: fromSms, body });
}

export async function sendWhatsApp(to, body) {
  if (!fromWhatsApp) throw new Error('TWILIO_WHATSAPP_FROM is not configured.');
  const client = getClient();
  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client.messages.create({ to: toWhatsApp, from: fromWhatsApp, body });
}
