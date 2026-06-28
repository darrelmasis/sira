import { QuickitThemeProvider, Toaster } from "quickit-ui"
import { AuthProvider } from "@/features/auth/AuthContext";
import { SyncProvider } from "@/features/sync/SyncProvider"

export function Providers({ children }) {
  return (
    <QuickitThemeProvider defaultTheme="system" storageKey="sira-theme">
      <AuthProvider>
        <SyncProvider>
          {children}
          <Toaster position="bottom-right" />
        </SyncProvider>
      </AuthProvider>
    </QuickitThemeProvider>
  )
}
