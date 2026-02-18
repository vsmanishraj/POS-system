import "./globals.css";
import { ReactNode } from "react";
import { AppShell } from "@/components/layout/shell";

export const metadata = {
  title: "Magroms POS System",
  description: "Multi-tenant cloud POS SaaS for restaurants"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
