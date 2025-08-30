import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TeamPage from "./pages/TeamPage";
import ReviewsPage from "./pages/ReviewsPage";
import SourcesPage from "./pages/SourcesPage";
import SummariesPage from "./pages/SummariesPage";
import ImporterPage from "./pages/ImporterPage";
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
              path="/home" 
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/team" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <TeamPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reviews" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <ReviewsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sources" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <SourcesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/summaries" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <SummariesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/importer" 
              element={
                <ProtectedRoute requiresOwnerManager>
                  <ImporterPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<LoginPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
