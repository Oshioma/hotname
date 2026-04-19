import Link from 'next/link';

export const metadata = {
  title: 'Terms — Hotname',
  description: 'Terms of service and messaging policy for Hotname.',
};

export default function TermsPage() {
  return (
    <>
      <nav>
        <Link href="/"><span className="logo">hotname<span className="logo-dot" /></span></Link>
      </nav>

      <div className="page" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          Terms & messaging policy
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '1.5rem' }}>
          Last updated: April 2026.
        </p>

        <section className="prose">
          <h3>Your Hotname</h3>
          <p>
            A Hotname is a handle you choose once (e.g. <code>@oshi</code>). Hotnames are
            lowercase, 3–30 characters, and permanent except for an administrator-led
            correction. Don&apos;t pick a handle that impersonates another person or brand.
          </p>

          <h3>Messages &amp; WhatsApp Business policy</h3>
          <p>
            Hotname routes messages to you via the channels you open (WhatsApp, SMS,
            email and post). When you sign up, you consent to the{' '}
            <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer">
              WhatsApp Business messaging policy
            </a>{' '}
            and agree that messages may be delivered through Twilio-powered channels.
            Messages are initiated by a human user on Hotname — we do not send
            unsolicited marketing on your behalf.
          </p>

          <h3>Consent to be contacted</h3>
          <p>
            Opening a channel (Public, Request, or Invite) is your explicit consent to
            receive messages through that channel via Hotname. You can change access
            or turn a channel Off at any time from <Link href="/channels">/channels</Link>.
          </p>

          <h3>Connection gate</h3>
          <p>
            Before anyone can message you, they must request to connect. You decide
            whether to accept. Declining a request blocks messaging until you
            reconsider; blocking is coming in a future update.
          </p>

          <h3>Privacy</h3>
          <p>
            Your channel details (phone numbers, email, postal address) are never
            exposed on your public profile unless you&apos;ve set a channel to Public
            <strong> and</strong> the channel is not marked private-by-design. Postal
            addresses are always kept private — we post letters on your behalf.
          </p>

          <h3>Abuse &amp; removal</h3>
          <p>
            Messages are stored so you can review them in your inbox. If you receive
            abuse, decline the connection and contact support.
          </p>
        </section>
      </div>
    </>
  );
}
