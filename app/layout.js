import '../styles/globals.css';

export const metadata = {
  title: 'Hotname',
  description: 'Send anonymous messages to anyone.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
