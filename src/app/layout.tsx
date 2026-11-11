import type { Metadata, Viewport } from "next";
import { allFontVariables } from "@/lib/design-system/fonts";
import { DesignSystemProvider } from "@/components/providers/design-system-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commonplace & Sanctuary — Design System",
  description:
    "Dual-experience design system combining an editorial public discovery portal with a personalised private sanctuary.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={allFontVariables}
      data-theme="editorial"
      data-mode="light"
      data-environment="editorial"
      data-reduced-motion="false"
    >
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] antialiased">
        <DesignSystemProvider>
          <ToastProvider>{children}</ToastProvider>
        </DesignSystemProvider>
      </body>
    </html>
  );
}

