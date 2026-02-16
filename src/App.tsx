import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import WorkoutSession from "./pages/WorkoutSession";
import Exercises from "./pages/Exercises";
import History from "./pages/History";
import WorkoutSummary from "./pages/WorkoutSummary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="dark mx-auto max-w-lg min-h-screen">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/workout/:dayId" element={<WorkoutSession />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:workoutId" element={<WorkoutSummary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
