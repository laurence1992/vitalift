import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import WorkoutSession from "./pages/WorkoutSession";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import WorkoutSummary from "./pages/WorkoutSummary";
import Inbox from "./pages/Inbox";
import Conversation from "./pages/Conversation";
import Progress from "./pages/Progress";
import Health from "./pages/Health";
import Recipes from "./pages/Recipes";
import Settings from "./pages/Settings";
import CoachDashboard from "./pages/coach/CoachDashboard";
import ClientProfile from "./pages/coach/ClientProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  const isCoach = profile?.role === "coach";

  return (
    <>
      <Routes>
        {/* Home - role dependent */}
        <Route path="/" element={isCoach ? <CoachDashboard /> : <Index />} />

        {/* Client workout routes */}
        <Route path="/workout/:dayId" element={<WorkoutSession />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:workoutId" element={<WorkoutSummary />} />

        {/* Shared routes */}
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:conversationId" element={<Conversation />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/health" element={<Health />} />

        {/* Coach routes */}
        <Route path="/coach/client/:clientId" element={<ClientProfile />} />

        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark mx-auto max-w-lg min-h-screen">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
