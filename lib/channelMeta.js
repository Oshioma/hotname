/**
 * Shared channel metadata.
 * `kind` is the value type the channel stores:
 *   phone  → E.164 number (Twilio delivery target)
 *   email  → email address
 *   url    → arbitrary URL
 *   handle → a username / id on another platform
 *
 * `valueToLink` turns a raw value into a clickable href (used when a viewer
 * has permission to see a channel that is marked `open`).
 */

export const CHANNEL_ORDER = [
  'inapp',
  'whatsapp',
  'sms',
  'phone',
  'email',
  'telegram',
  'signal',
  'instagram',
  'website',
  'booking',
  'post',
];

/**
 * `deliverable`: Hotname can route a message through this channel.
 *   true  → WhatsApp / SMS / Email — routed via Twilio or the owner's inbox.
 *           Shown in the message composer as a delivery option.
 *   false → Telegram / Instagram / Website / Booking / voice / Signal.
 *           These are 'reach-them-yourself' channels — shown as a link
 *           when Public, never shown in the composer. (Except when the
 *           owner has set them to Request mode, in which case the viewer
 *           asks for the value.)
 */
export const CHANNEL_META = {
  // Virtual: always available, no detail to configure. Messages go straight
  // to the owner's Hotname inbox — no external delivery.
  inapp:     { label: 'In app',      kind: 'virtual', deliverable: true, virtual: true,
               hint: 'Delivered to their Hotname inbox' },
  whatsapp:  { label: 'WhatsApp',    kind: 'phone',  deliverable: true,  hint: 'Message via WhatsApp',
               valueToLink: (v) => `https://wa.me/${v.replace(/^\+/, '')}` },
  sms:       { label: 'SMS',         kind: 'phone',  deliverable: true,  hint: 'Text message',
               valueToLink: (v) => `sms:${v}` },
  phone:     { label: 'Voice call',  kind: 'phone',  deliverable: false, hint: 'Phone call',
               valueToLink: (v) => `tel:${v}` },
  email:     { label: 'Email',       kind: 'email',  deliverable: true,  hint: 'Email',
               valueToLink: (v) => `mailto:${v}` },
  telegram:  { label: 'Telegram',    kind: 'handle', deliverable: false, hint: 'Telegram username',
               valueToLink: (v) => `https://t.me/${v.replace(/^@/, '')}` },
  signal:    { label: 'Signal',      kind: 'phone',  deliverable: false, hint: 'Signal number',
               valueToLink: (v) => `https://signal.me/#p/${v}` },
  instagram: { label: 'Instagram',   kind: 'handle', deliverable: false, hint: 'Instagram handle',
               valueToLink: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  website:   { label: 'Website',     kind: 'url',    deliverable: false, hint: 'Personal site',
               valueToLink: (v) => v },
  booking:   { label: 'Book a call', kind: 'url',    deliverable: false, hint: 'Booking link',
               valueToLink: (v) => v },
  // Post is a message-style channel — Hotname posts the letter on the
  // owner's behalf. The address is stored server-side and NEVER exposed
  // on the profile page (no link-out, no value sent to the client).
  post:      { label: 'Post',        kind: 'address', deliverable: true, privateValue: true,
               hint: 'We post the letter for you' },
};

export const ACCESS_MODES = ['open', 'request', 'selected', 'hidden'];

export const ACCESS_LABEL = {
  open:     'Public',
  request:  'Request',
  selected: 'Invite',
  hidden:   'Off',
};

export const ACCESS_DESCRIPTION = {
  open:     'Anyone can see the detail directly.',
  request:  'Channel is listed, but details only after you approve each request.',
  selected: 'Only specific usernames you choose can see this.',
  hidden:   'Not shown on your profile.',
};

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const URL_RE   = /^https?:\/\/.+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalise a raw phone string to E.164.
 *   +447951769553 → +447951769553
 *   447951769553  → +447951769553
 *   07951769553   → +447951769553   (UK assumption)
 *   0044xxx       → +44xxx
 * Any spaces / dashes / parens are stripped.
 */
export function normalisePhone(raw, defaultCountry = '44') {
  if (!raw) return raw;
  const cleaned = String(raw).replace(/[\s()\-.]/g, '');
  if (!cleaned) return raw;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (cleaned.startsWith('0'))  return '+' + defaultCountry + cleaned.slice(1);
  // bare international (e.g. 447951…) — add the plus
  return '+' + cleaned;
}

/**
 * Normalise a raw URL — add https:// if the user typed www.example.com.
 */
export function normaliseUrl(raw) {
  if (!raw) return raw;
  const trimmed = String(raw).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed.replace(/^\/+/, '');
}

/**
 * Normalise any channel value before saving.
 */
export function normaliseChannelValue(type, value) {
  const kind = CHANNEL_META[type]?.kind;
  if (!kind || !value) return value;
  if (kind === 'phone') return normalisePhone(value);
  if (kind === 'url')   return normaliseUrl(value);
  if (kind === 'handle') return String(value).trim().replace(/^@/, '');
  if (kind === 'address') return String(value).trim().replace(/\s+\n/g, '\n');
  return String(value).trim();
}

export function validateChannelValue(type, value) {
  const kind = CHANNEL_META[type]?.kind;
  if (!kind) return 'Unknown channel.';
  if (!value) return 'Value required.';
  if (kind === 'phone' && !PHONE_RE.test(value)) {
    return 'Enter a mobile number — e.g. 07951 769553 or +447951769553.';
  }
  if (kind === 'email' && !EMAIL_RE.test(value)) {
    return 'Enter a valid email address.';
  }
  if (kind === 'url' && !URL_RE.test(value)) {
    return 'Enter a website URL.';
  }
  if (kind === 'address' && value.trim().length < 5) {
    return 'Enter a full postal address.';
  }
  return null;
}
