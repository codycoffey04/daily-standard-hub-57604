import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

// Pages
import LoginPage from "./pages/LoginPage";
import TeamPage from "./pages/TeamPage";
import SourcesPage from "./pages/SourcesPage";
import SummariesPage from "./pages/SummariesPage";
import ImporterPage from "./pages/ImporterPage";
import { AccountabilityReviewsPage } from "./pages/AccountabilityReviewsPage";
import { AdminReviewsPage } from "./pages/AdminReviewsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
            <Route path="/" element={<TeamPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
