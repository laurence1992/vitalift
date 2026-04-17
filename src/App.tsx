import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import AIChatBubble from "@/components/AIChatBubble";
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
import CoachTraining from "./pages/coach/CoachTraining";
import Nutrition from "./pages/Nutrition";
import ProgramWorkoutSession from "./pages/ProgramWorkoutSession";
import AIProgramme from "./pages/AIProgramme";
import Cardio from "./pages/Cardio";
import Progress from "./pages/Progress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-sm px-8">
          <div className="h-8 w-32 bg-[#1C1C2E] rounded-xl animate-pulse mx-auto" />
          <div className="h-4 w-48 bg-[#242438] rounded-xl animate-pulse mx-auto" />
        </div>
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

        {/* Client & Coach training routes */}
        <Route path="/training" element={isCoach ? <CoachTraining /> : <Index />} />
        <Route path="/workouts" element={<History />} />
        <Route path="/history/:workoutId" element={<WorkoutSummary />} />
        <Route path="/exercises" element={<Exercises />} />

        {/* AI Programme */}
        <Route path="/ai-programme" element={<AIProgramme />} />

        {/* Cardio */}
        <Route path="/cardio" element={<Cardio />} />

        {/* Progress */}
        <Route path="/progress" element={<Progress />} />

        {/* Nutrition */}
        <Route path="/nutrition" element={<Nutrition />} />

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
      <AIChatBubble />
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
