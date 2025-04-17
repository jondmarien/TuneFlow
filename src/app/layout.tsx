// --- Root Layout ---
/**
 * RootLayout component for the TuneFlow application.
 *
 * Sets up global fonts, metadata, and wraps the application with providers and global UI components.
 *
 * @param children - The page content to render inside the layout.
 */
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; 
import { DarkReaderFixWrapper } from '@/components/DarkReaderFixWrapper';
import SessionProviderWrapper from "./SessionProviderWrapper";
import ThemeToggle from '../components/ThemeToggle';

// --- Font Setup ---
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// --- Metadata ---
export const metadata: Metadata = {
  title: 'TuneFlow App', 
  description: 'Parse YouTube comments for songs and create Spotify playlists', 
};

// --- Layout Component ---
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="system">
      <head>
        <meta name="apple-mobile-web-app-title" content="TuneFlow" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Apply Dark Reader fix to avoid hydration issues */}
        <DarkReaderFixWrapper />
        <ThemeToggle />
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
        {/* Global toast notifications */}
        <Toaster /> 
      </body>
    </html>
  );
}
