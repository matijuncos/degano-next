import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import 'mantine-datatable/styles.layer.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import Navbar from '@/components/NavBar/NavBar';
import { DeganoProvider } from '@/context/DeganoContext';
import BottomNavBar from '@/components/BottomNavBar/BottomNavBar';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Degano',
  description: 'Gestión de eventos'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={inter.className}>
        <MantineProvider defaultColorScheme='dark'>
          <DeganoProvider>
            <UserProvider>
              <div style={{ display: 'flex', width: '100%' }}>
                <div className='navbar-to-hide'>
                  <Navbar />
                </div>
                <div className='navbar-to-show'>
                  <BottomNavBar />
                </div>
                <div
                  className='everything-container'
                  style={{
                    width: '100%',
                    padding: '16px'
                  }}
                >
                  <Suspense fallback={'Loading....'}>{children}</Suspense>
                </div>
              </div>
            </UserProvider>
          </DeganoProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
