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
  'whatsapp',
  'sms',
  'phone',
  'email',
  'telegram',
  'signal',
  'instagram',
  'website',
  'booking',
];

export const CHANNEL_META = {
  whatsapp:  { label: 'WhatsApp',   kind: 'phone',  hint: 'Message via WhatsApp',
               valueToLink: (v) => `https://wa.me/${v.replace(/^\+/, '')}` },
  sms:       { label: 'SMS',        kind: 'phone',  hint: 'Text message',
               valueToLink: (v) => `sms:${v}` },
  phone:     { label: 'Voice call', kind: 'phone',  hint: 'Phone call',
               valueToLink: (v) => `tel:${v}` },
  email:     { label: 'Email',      kind: 'email',  hint: 'Email',
               valueToLink: (v) => `mailto:${v}` },
  telegram:  { label: 'Telegram',   kind: 'handle', hint: 'Telegram username',
               valueToLink: (v) => `https://t.me/${v.replace(/^@/, '')}` },
  signal:    { label: 'Signal',     kind: 'phone',  hint: 'Signal number',
               valueToLink: (v) => `https://signal.me/#p/${v}` },
  instagram: { label: 'Instagram',  kind: 'handle', hint: 'Instagram handle',
               valueToLink: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  website:   { label: 'Website',    kind: 'url',    hint: 'Personal site',
               valueToLink: (v) => v },
  booking:   { label: 'Book a call', kind: 'url',   hint: 'Booking link',
               valueToLink: (v) => v },
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

export function validateChannelValue(type, value) {
  const kind = CHANNEL_META[type]?.kind;
  if (!kind) return 'Unknown channel.';
  if (!value) return 'Value required.';
  if (kind === 'phone' && !PHONE_RE.test(value)) {
    return 'Phone must be E.164 format (e.g. +447911123456).';
  }
  if (kind === 'email' && !EMAIL_RE.test(value)) {
    return 'Enter a valid email address.';
  }
  if (kind === 'url' && !URL_RE.test(value)) {
    return 'Enter a full URL (https://…).';
  }
  return null;
}
