"use client";

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export function ClientBody({ children }: { children: React.ReactNode }) {
  return (
    <body className="antialiased" suppressHydrationWarning>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </body>
  );
}
