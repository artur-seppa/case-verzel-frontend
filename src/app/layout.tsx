import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono } from "next/font/google";
import Box from "@mui/material/Box";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { QueryProvider } from "@/shared/providers/query-provider";
import { ToastProvider } from "@/shared/ui/toast-provider";
import { AppSidebar } from "@/shared/ui/app-sidebar";
import { ProfileMenu } from "@/shared/ui/profile-menu";
import { GatekeeperGuard } from "@/shared/ui/gatekeeper-guard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Grotesco condensado dos blocos de crédito de pôster e da sinalização de bilheteria.
const displaySans = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Case Verzel — Eventos e Ingressos",
  description: "Plataforma de eventos e ingressos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${displaySans.variable}`}
    >
      <body>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <Box sx={{ display: "flex" }}>
                <GatekeeperGuard />
                <AppSidebar />
                <ProfileMenu />
                <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: "100vh", overflowX: "hidden" }}>
                  {children}
                </Box>
              </Box>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
