import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ColorSchemeScript, Flex, MantineProvider, Box } from '@mantine/core';
import '@mantine/core/styles.css';
import 'mantine-datatable/styles.layer.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import Navbar from '@/components/NavBar/NavBar';
import { DeganoProvider } from '@/context/DeganoContext';
import BottomNavBar from '@/components/BottomNavBar/BottomNavBar';
import { Suspense } from 'react';
import { Notifications } from '@mantine/notifications';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Degano',
  description: 'Gestión de eventos',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  }
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
        <MantineProvider forceColorScheme='dark' defaultColorScheme='dark'>
          <Notifications />
          <DeganoProvider>
            <UserProvider>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  minHeight: '100vh',
                  position: 'relative'
                }}
              >
                {/* Sidebar - hide on mobile/tablet (<1024px), show on desktop */}
                <Box display={{ base: 'none', md: 'block' }}>
                  <Navbar />
                </Box>

                {/* Content area - full width on mobile/tablet, calc on desktop */}
                <Box
                  w={{ base: '100%', md: 'calc(100% - 80px)' }}
                  style={{
                    padding: '16px',
                    marginLeft: 'auto'
                  }}
                  pb={{ base: '80px', md: '16px' }}
                >
                  {children}
                </Box>
              </div>

              {/* Bottom nav - show on mobile/tablet (<1024px), hide on desktop */}
              <Box display={{ base: 'block', md: 'none' }}>
                <BottomNavBar />
              </Box>
            </UserProvider>
          </DeganoProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
