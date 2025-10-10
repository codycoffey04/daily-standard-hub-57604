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

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TeamPage from "./pages/TeamPage";
import SourcesPage from "./pages/SourcesPage";
import SummariesPage from "./pages/SummariesPage";
import ImporterPage from "./pages/ImporterPage";
import { AccountabilityReviewsPage } from "./pages/AccountabilityReviewsPage";
import { AdminReviewsPage } from "./pages/AdminReviewsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const { profile } = useAuth();
  const redirectPath = getRedirectPath(profile);
  return <Navigate to={redirectPath} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
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
              path="/accountability" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AccountabilityReviewsPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reviews" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <AppLayout>
                    <AdminReviewsPage />
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
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
