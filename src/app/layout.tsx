import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { SyncProvider } from "@/components/sync/SyncProvider";
import { DataProvider } from "@/context/DataProvider";
import { DataLoader } from "@/components/common/DataLoader";
import { ClientRipple } from "@/components/common/ClientRipple";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "3EJS Tech | Internet Service Management",
  description: "Modern internet installation service management system",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--color-background,#fff)] text-[var(--color-text,#1e293b)]">
        <ThemeProvider>
          <DataProvider>
            <AuthProvider>
              <SyncProvider>
                <ClientRipple>
                  <DataLoader>
                    {children}
                  </DataLoader>
                </ClientRipple>
              </SyncProvider>
            </AuthProvider>
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}