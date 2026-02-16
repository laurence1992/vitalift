import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { getWorkouts } from "@/lib/storage";
import { workoutDays, exercises as allExercises } from "@/data/exercises";
import { format } from "date-fns";

export default function WorkoutSummary() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();

  const workout = getWorkouts().find((w) => w.id === workoutId);
  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Workout not found</p>
      </div>
    );
  }

  const day = workoutDays.find((d) => d.id === workout.dayId);

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate("/history")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">
            {day?.label} – {day?.subtitle}
          </h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(workout.date), "EEEE, MMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {workout.exercises.map((exLog) => {
          const ex = allExercises.find((e) => e.id === exLog.exerciseId);
          const volume = exLog.sets.reduce(
            (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
            0
          );

          return (
            <div
              key={exLog.exerciseId}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {ex?.image ? (
                  <img
                    src={ex.image}
                    alt={ex?.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs">
                    {(ex?.name || exLog.exerciseId).slice(0, 2)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{ex?.name || exLog.exerciseId}</p>
                  {volume > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Volume: {volume.toLocaleString()} kg
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {exLog.sets.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-lg bg-muted/50 px-3 py-1.5 text-sm"
                  >
                    <span className="w-8 text-xs font-bold text-muted-foreground">
                      Set {s.setNumber}
                    </span>
                    <span>{s.weight ?? "–"} kg</span>
                    <span>× {s.reps ?? "–"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {workout.sessionNotes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{workout.sessionNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
