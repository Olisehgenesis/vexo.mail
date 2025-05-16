
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import '@coinbase/onchainkit/styles.css';

export const metadata: Metadata = {
  title: "Vexo Mails",
  description: 'Emails Straight to your Wallet',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
