import { notFound } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/app/components/Logo';
import ProfileCard from '@/app/components/ProfileCard';
import { loadProfileView } from '@/lib/profileView';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return {
    title: `@${username} — Hotname`,
    description: `Reach @${username} through Hotname.`,
  };
}

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const view = await loadProfileView(username);
  if (!view) notFound();

  return (
    <div className="profile-page">
      <nav>
        <Link href="/"><Logo /></Link>
        <div className="nav-actions">
          {view.viewerLoggedIn ? (
            <Link href="/dashboard"><button className="btn-ghost">Dashboard</button></Link>
          ) : (
            <>
              <Link href="/login"><button className="btn-ghost">Log in</button></Link>
              <Link href="/signup"><button className="btn-primary">Claim yours</button></Link>
            </>
          )}
        </div>
      </nav>

      <ProfileCard view={view} />

      <div className="profile-footer">
        <Link href="/">Powered by hotname · Private unless they make it public.</Link>
      </div>
    </div>
  );
}
