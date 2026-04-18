import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotname",
  description: "Sign in to your Hotname account.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
