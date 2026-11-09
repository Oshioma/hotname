import '../styles/globals.css';
import { FormDrafts } from '@/app/components/FormDrafts';

export const metadata = {
  title: 'Hotname — one name. The right way to reach you.',
  description: 'Share one name. Let people reach you through the channels you choose — without exposing everything.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Every form on the site survives a refresh — see app/components/FormDrafts. */}
        <FormDrafts />
      </body>
    </html>
  );
}
