import type { Metadata, Viewport } from "next";
import { allFontVariables } from "@/lib/design-system/fonts";
import { DesignSystemProvider } from "@/components/providers/design-system-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Meridian",
    template: "%s | Meridian",
  },
  description: "An independent journal of ideas, arts, and quiet philosophy.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function() {
  try {
    var path = window.location.pathname;
    var isPrivate = path.startsWith('/home') || path.startsWith('/messages') || path.startsWith('/calls') || path.startsWith('/settings') || path.startsWith('/shared') || path.startsWith('/prompts') || path.startsWith('/setup') || path.startsWith('/games') || path.startsWith('/memories') || path.startsWith('/questions') || path.startsWith('/calendar');
    var env = isPrivate ? 'private' : 'editorial';
    var cached = localStorage.getItem('commonplace:ds:v1:' + env);
    var mode = 'system';
    var theme = env === 'private' ? 'ivory' : 'editorial';
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed.mode) mode = parsed.mode;
      if (parsed.palette) theme = parsed.palette;
    }
    var resolvedMode = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    var root = document.documentElement;
    root.setAttribute('data-mode', resolvedMode);
    root.setAttribute('data-mode-preference', mode);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-environment', env);
  } catch (e) {}
})();`;

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
      data-mode-preference="system"
      data-environment="editorial"
      data-reduced-motion="false"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] antialiased">
        <DesignSystemProvider>
          <ToastProvider>{children}</ToastProvider>
        </DesignSystemProvider>
      </body>
    </html>
  );
}

