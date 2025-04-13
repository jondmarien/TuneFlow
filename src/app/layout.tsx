import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; 
import { DarkReaderFixWrapper } from '@/components/DarkReaderFixWrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TuneFlow App', 
  description: 'Parse YouTube comments for songs and create Spotify playlists', 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="system">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <DarkReaderFixWrapper />
        {children}
        <Toaster /> 
      </body>
    </html>
  );
}
