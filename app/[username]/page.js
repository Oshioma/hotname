import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BioMessageForm from './BioMessageForm';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} — Hotname`,
    description: `Send ${username} an anonymous message.`,
  };
}

export default async function BioPage({ params }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, phone_number')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();

  const initials = (profile.display_name || profile.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bio-page">
      <nav className="bio-nav">
        <Link href="/"><span className="logo">hot<span>name</span></span></Link>
        <Link href="/signup"><button className="btn-ghost" style={{ fontSize: '12px' }}>Get your Hotname →</button></Link>
      </nav>

      <div className="bio-hero">
        {/* Avatar */}
        <div className="bio-avatar">{initials}</div>

        {/* Identity */}
        <h1 className="bio-name">{profile.display_name || `@${profile.username}`}</h1>
        <p className="bio-handle">@{profile.username}</p>

        {/* Bio */}
        {profile.bio && <p className="bio-text">{profile.bio}</p>}
      </div>

      {/* Message form */}
      <div className="bio-form-wrap">
        <BioMessageForm username={profile.username} />
      </div>

      {/* Powered by footer */}
      <div className="bio-footer">
        <Link href="/">Powered by <strong>hotname</strong></Link>
      </div>
    </div>
  );
}
