import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
import { getWorkouts } from "@/lib/storage";
import { workoutDays } from "@/data/exercises";
import { format } from "date-fns";

export default function History() {
  const navigate = useNavigate();
  const workouts = getWorkouts().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold">Workout History</h1>
      </div>

      {workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="mb-3 h-10 w-10" />
          <p className="text-sm">No workouts yet</p>
          <p className="text-xs">Complete a workout to see it here</p>
        </div>
      ) : (
        <div className="space-y-2 px-5">
          {workouts.map((w) => {
            const day = workoutDays.find((d) => d.id === w.dayId);
            const totalSets = w.exercises.reduce((sum, e) => sum + e.sets.length, 0);
            return (
              <button
                key={w.id}
                onClick={() => navigate(`/history/${w.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left active:scale-[0.98] transition-all"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {day?.label} – {day?.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(w.date), "EEEE, MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.exercises.length} exercises · {totalSets} sets
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
