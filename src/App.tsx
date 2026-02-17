import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Index from "./pages/Index";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import WorkoutSummary from "./pages/WorkoutSummary";
import Inbox from "./pages/Inbox";
import Conversation from "./pages/Conversation";
import Recipes from "./pages/Recipes";
import Settings from "./pages/Settings";
import CoachDashboard from "./pages/coach/CoachDashboard";
import ClientProfile from "./pages/coach/ClientProfile";
import CoachExerciseLibraryPage from "./pages/coach/CoachExerciseLibraryPage";
import ProgramWorkoutSession from "./pages/ProgramWorkoutSession";
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

  const pathname = window.location.pathname;
  if (pathname === "/update-password") {
    return (
      <Routes>
        <Route path="/update-password" element={<UpdatePassword />} />
      </Routes>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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

        {/* Client routes */}
        <Route path="/workouts" element={<History />} />
        <Route path="/history/:workoutId" element={<WorkoutSummary />} />
        <Route path="/exercises" element={<Exercises />} />

        {/* Shared routes */}
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:conversationId" element={<Conversation />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/settings" element={<Settings />} />

        {/* Coach routes */}
        <Route path="/coach/client/:clientId" element={<ClientProfile />} />
        <Route path="/coach/exercises" element={<CoachExerciseLibraryPage />} />

        {/* Program-based workout */}
        <Route path="/workout/program/:dayId" element={<ProgramWorkoutSession />} />

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
