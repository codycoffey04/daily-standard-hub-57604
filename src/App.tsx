import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { getRedirectPath } from "@/lib/auth";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TeamPage from "./pages/TeamPage";
import SourcesPage from "./pages/SourcesPage";
import SummariesPage from "./pages/SummariesPage";
import ImporterPage from "./pages/ImporterPage";
import SalesServicePage from "./pages/SalesServicePage";
import { PatternInsightsPage } from "./pages/PatternInsightsPage";
import CoachingPage from "./pages/CoachingPage";
import EmailUpdatesPage from "./pages/EmailUpdatesPage";
import CSRDashboardPage from "./pages/CSRDashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing: false, // Force React Query to always trigger re-renders
      staleTime: 0, // Data is always stale, refetch on queryKey change
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});

const RootRedirect = () => {
  const { profile } = useAuth();
  const redirectPath = getRedirectPath(profile);
  return <Navigate to={redirectPath} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route 
                  path="/producer" 
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <HomePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/sales-service" 
                  element={
                    <ProtectedRoute requiresRoles={['sales_service']}>
                      <AppLayout>
                        <SalesServicePage />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/team"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <TeamPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/summaries"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <SummariesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coaching"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <CoachingPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/email-updates"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <EmailUpdatesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/insights"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <PatternInsightsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/sources" 
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <SourcesPage />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/importer"
                  element={
                    <ProtectedRoute requiresOwnerManager>
                      <AppLayout>
                        <ImporterPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/csr"
                  element={
                    <ProtectedRoute requiresRoles={['csr', 'owner', 'manager']}>
                      <AppLayout>
                        <CSRDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <RootRedirect />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
