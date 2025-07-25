import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { initializeFirestoreWithOfflineHandling } from "@/lib/firestore-utils";

// Initialize Firestore offline handling for development
if (typeof window !== 'undefined') {
  initializeFirestoreWithOfflineHandling();
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GEOCITY - Smart City Mapping",
  description: "Professional mapping application for smart city management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
