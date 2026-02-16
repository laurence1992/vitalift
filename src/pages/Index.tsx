import { useNavigate } from "react-router-dom";
import { Dumbbell, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workoutDays } from "@/data/exercises";
import { getRecentWorkouts } from "@/lib/storage";
import { format } from "date-fns";

export default function Index() {
  const navigate = useNavigate();
  const recent = getRecentWorkouts(5);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Dumbbell className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Workout Tracker</h1>
        </div>
        <p className="text-muted-foreground text-sm">Let's crush it today 💪</p>
      </div>

      <div className="px-5 -mt-4 space-y-6">
        {/* Day selection */}
        <div className="grid grid-cols-2 gap-3">
          {workoutDays.map((day) => (
            <button
              key={day.id}
              onClick={() => navigate(`/workout/${day.id}`)}
              className="flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all active:scale-[0.97]"
            >
              <span className="text-xs font-semibold uppercase text-primary">{day.label}</span>
              <span className="mt-1 text-sm font-medium">{day.subtitle}</span>
              <span className="mt-2 text-xs text-muted-foreground">
                {day.exercises.length} exercises
              </span>
            </button>
          ))}
        </div>

        {/* Recent workouts */}
        {recent.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {recent.map((w) => {
                const day = workoutDays.find((d) => d.id === w.dayId);
                return (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/history/${w.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {day?.label} – {day?.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(w.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
