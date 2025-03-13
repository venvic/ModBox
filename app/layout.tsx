"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-slidebar";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/database";
import { usePathname } from "next/navigation";
import Head from "next/head";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Custom hook to check if the user is authenticated
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  return isAuthenticated;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAuthenticated = useAuth();
  const pathname = usePathname();
  const showSidebar = !pathname.startsWith("/live") && pathname !== "/";

  return (
    <html lang="de">
      <Head>
        <title>Modbox</title>
        <meta name="description" content="Heimat Info iFrame modules generator." />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider defaultOpen={false}>
          {isAuthenticated && showSidebar && <AppSidebar />}
          {children}
          <Toaster />
        </SidebarProvider>
      </body>
    </html>
  );
}