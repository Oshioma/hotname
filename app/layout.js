import '../styles/globals.css';

export const metadata = {
  title: 'Hotname — one name. The right way to reach you.',
  description: 'Share one name. Let people reach you through the channels you choose — without exposing everything.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
