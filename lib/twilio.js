import twilio from 'twilio';

const accountSid  = process.env.TWILIO_ACCOUNT_SID;
const authToken   = process.env.TWILIO_AUTH_TOKEN;
const fromSms     = process.env.TWILIO_PHONE_NUMBER;
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;
const verifySid   = process.env.TWILIO_VERIFY_SERVICE_SID;

function getClient() {
  if (!accountSid || !authToken) throw new Error('Twilio credentials are not configured.');
  return twilio(accountSid, authToken);
}

export async function sendSms(to, body) {
  if (!fromSms) throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  return getClient().messages.create({ to, from: fromSms, body });
}

export async function sendWhatsApp(to, body) {
  if (!fromWhatsApp) throw new Error('TWILIO_WHATSAPP_FROM is not configured.');
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return getClient().messages.create({ to: toWa, from: fromWhatsApp, body });
}

export async function sendVerificationCode(phone) {
  if (!verifySid) throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured.');
  return getClient().verify.v2.services(verifySid).verifications.create({
    to: phone,
    channel: 'sms',
  });
}

export async function checkVerificationCode(phone, code) {
  if (!verifySid) throw new Error('TWILIO_VERIFY_SERVICE_SID is not configured.');
  const result = await getClient().verify.v2.services(verifySid).verificationChecks.create({
    to: phone,
    code,
  });
  return result.status === 'approved';
}
