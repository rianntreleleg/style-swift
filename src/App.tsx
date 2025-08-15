import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { MobileOptimizer } from "@/components/MobileOptimizer";
import Favicon from "@/components/Favicon";
import { lazy, Suspense } from "react";
import { PageLoadingSpinner } from "@/components/LoadingSpinner";

// Lazy Loading - Carregamento sob demanda
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Subscription = lazy(() => import("./pages/Subscription"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const Success = lazy(() => import("./pages/Success"));
const Cancel = lazy(() => import("./pages/Cancel"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos
      staleTime: 5 * 60 * 1000,
      // Manter cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Retry 3 vezes em caso de erro
      retry: 3,
      // Refetch quando janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry 2 vezes em caso de erro
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="style-swift-theme">
      <AuthProvider>
        <TooltipProvider>
          <Favicon />
          <MobileOptimizer>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/agendamento" element={<PublicBooking />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/cancel" element={<Cancel />} />
                  <Route path="/:slug" element={<PublicBooking />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </MobileOptimizer>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
