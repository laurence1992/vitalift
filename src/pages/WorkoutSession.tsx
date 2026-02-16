import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, RefreshCw, Trophy, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workoutDays, type DayExercise } from "@/data/exercises";
import {
  type WorkoutLog,
  type SetLog,
  type ExerciseLog,
  saveWorkout,
  getLastSetsForExercise,
  getPersonalBest,
  getLastWorkoutForDay,
} from "@/lib/storage";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseTargetSets(ts: number | string): number {
  if (typeof ts === "number") return ts;
  const parts = ts.replace(/[–—-]/g, "-").split("-").map(Number);
  return Math.max(...parts);
}

export default function WorkoutSession() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const day = workoutDays.find((d) => d.id === dayId);

  const [workoutId] = useState(() => generateId());
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [repeatedToast, setRepeatedToast] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    const initial: Record<string, SetLog[]> = {};
    day.exercises.forEach((ex, exIdx) => {
      const key = `${ex.id}-${exIdx}`;
      const numSets = parseTargetSets(ex.targetSets);
      initial[key] = Array.from({ length: numSets }, (_, i) => ({
        setNumber: i + 1,
        weight: null,
        reps: null,
      }));
    });
    setExerciseLogs(initial);
  }, [day]);

  const totalVolume = useMemo(() => {
    return Object.values(exerciseLogs).reduce(
      (total, sets) =>
        total + sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
      0
    );
  }, [exerciseLogs]);

  if (!day) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Day not found</p>
      </div>
    );
  }

  const updateSet = (exKey: string, setIdx: number, field: "weight" | "reps", value: string) => {
    setExerciseLogs((prev) => {
      const sets = [...(prev[exKey] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value === "" ? null : Number(value) };
      return { ...prev, [exKey]: sets };
    });
  };

  const repeatLastWorkout = () => {
    const lastWorkout = getLastWorkoutForDay(day.id, workoutId);
    if (!lastWorkout) {
      setRepeatedToast("No previous workout to repeat.");
      setTimeout(() => setRepeatedToast(null), 2500);
      return;
    }

    setExerciseLogs((prev) => {
      const updated = { ...prev };
      day.exercises.forEach((ex, exIdx) => {
        const key = `${ex.id}-${exIdx}`;
        const currentSets = updated[key] || [];
        const lastExLog = lastWorkout.exercises.find((e) => e.exerciseId === ex.id);
        if (!lastExLog) return;

        updated[key] = currentSets.map((set, i) => {
          const lastSet = lastExLog.sets[i];
          if (!lastSet) return set;
          return {
            ...set,
            weight: set.weight ?? lastSet.weight,
            reps: set.reps ?? lastSet.reps,
          };
        });
      });
      return updated;
    });

    setRepeatedToast("Autofilled from last workout!");
    setTimeout(() => setRepeatedToast(null), 2500);
  };

  const finishWorkout = () => {
    const exercises: ExerciseLog[] = day.exercises.map((ex, exIdx) => ({
      exerciseId: ex.id,
      sets: exerciseLogs[`${ex.id}-${exIdx}`] || [],
    }));

    const workout: WorkoutLog = {
      id: workoutId,
      date: new Date().toISOString(),
      dayId: day.id,
      exercises,
      sessionNotes,
    };
    saveWorkout(workout);
    navigate(`/history/${workout.id}`);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold">{day.label} – {day.subtitle}</h1>
          <p className="text-xs text-muted-foreground">{day.exercises.length} exercises</p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Day note */}
        {day.dayNote && (
          <p className="text-xs text-primary/80 italic text-center rounded-lg bg-primary/5 px-3 py-2">
            {day.dayNote}
          </p>
        )}

        {/* Repeat Last Workout */}
        <Button
          variant="outline"
          onClick={repeatLastWorkout}
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <RefreshCw className="h-4 w-4" />
          Repeat Last Workout
        </Button>

        {repeatedToast && (
          <p className="text-center text-xs font-medium text-primary animate-in fade-in">
            {repeatedToast}
          </p>
        )}

        {day.exercises.map((ex, exIdx) => {
          const exKey = `${ex.id}-${exIdx}`;
          const sets = exerciseLogs[exKey] || [];
          const pb = getPersonalBest(ex.id);
          const exVolume = sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
          const isFinisher = ex.notes === "Finisher";
          const prevEx = exIdx > 0 ? day.exercises[exIdx - 1] : null;
          const isFirstFinisher = isFinisher && prevEx?.notes !== "Finisher";

          return (
            <div key={exKey} className={isFinisher && !isFirstFinisher ? "-mt-2" : ""}>
              {isFirstFinisher && (
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70 mb-2 mt-2">
                  🔥 Finisher
                </p>
              )}
              <ExerciseCard
                exercise={ex}
                sets={sets}
                pb={pb}
                exerciseVolume={exVolume}
                onUpdateSet={(setIdx, field, value) => updateSet(exKey, setIdx, field, value)}
              />
            </div>
          );
        })}

        {/* Session notes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-2 block text-sm font-medium">Session Notes</label>
          <Textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="How did it feel? Any PRs?"
            className="min-h-[80px] bg-background"
          />
        </div>

        {/* Total volume */}
        {totalVolume > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold text-primary">{totalVolume.toLocaleString()} kg</p>
          </div>
        )}

        <Button onClick={finishWorkout} className="w-full h-12 text-base font-semibold" size="lg">
          <Check className="mr-2 h-5 w-5" />
          Finish Workout
        </Button>
      </div>
    </div>
  );
}

/* ---- Exercise Card ---- */

function ExerciseCard({
  exercise,
  sets,
  pb,
  exerciseVolume,
  onUpdateSet,
}: {
  exercise: DayExercise;
  sets: SetLog[];
  pb: { weight: number; reps: number } | null;
  exerciseVolume: number;
  onUpdateSet: (setIdx: number, field: "weight" | "reps", value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden p-4 space-y-3">
      {/* Exercise name */}
      <h3 className="text-lg font-bold text-foreground">{exercise.name || "Unnamed Exercise"}</h3>
      {exercise.notes && (
        <p className="text-xs text-primary/80">{exercise.notes}</p>
      )}

      {/* Image */}
      {exercise.image && (
        <div className="flex items-center justify-center rounded-lg bg-muted/30 p-2">
          <img
            src={exercise.image}
            alt={exercise.name}
            className="w-full max-h-[200px] rounded-md object-contain"
          />
        </div>
      )}

      {/* Watch Demo */}
      {exercise.videoUrl && exercise.videoUrl.trim() !== "" && (() => {
        const cleanUrl = exercise.videoUrl.trim().startsWith("http") ? exercise.videoUrl.trim() : `https://${exercise.videoUrl.trim()}`;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                try {
                  const w = window.open(cleanUrl, "_blank", "noopener,noreferrer");
                  if (!w) {
                    import("@/hooks/use-toast").then(m => m.toast({ title: "Link blocked in this browser. Use Copy Demo Link." }));
                  }
                } catch {
                  import("@/hooks/use-toast").then(m => m.toast({ title: "Link blocked in this browser. Use Copy Demo Link." }));
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Watch Demo
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cleanUrl);
                import("@/hooks/use-toast").then(m => m.toast({ title: "Link copied — paste into browser" }));
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </button>
          </div>
        );
      })()}

      {/* Personal Best */}
      <div className="flex items-center gap-2 text-sm">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-medium">Personal Best:</span>
        <span className="text-muted-foreground">
          {pb ? `${pb.weight}kg × ${pb.reps}` : "—"}
        </span>
      </div>

      {/* Target */}
      <p className="text-xs text-muted-foreground">
        Target: {exercise.targetSets} × {exercise.targetReps}
      </p>

      {/* Set inputs */}
      <div className="space-y-2">
        <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-xs font-semibold text-muted-foreground px-1">
          <span>Set</span>
          <span>Weight (kg)</span>
          <span>Reps</span>
        </div>
        {sets.map((set, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
            <span className="text-center text-sm font-bold text-muted-foreground">{set.setNumber}</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.weight ?? ""}
              onChange={(e) => onUpdateSet(i, "weight", e.target.value)}
              className="h-10 bg-background text-center"
            />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={set.reps ?? ""}
              onChange={(e) => onUpdateSet(i, "reps", e.target.value)}
              className="h-10 bg-background text-center"
            />
          </div>
        ))}
      </div>

      {/* Exercise volume */}
      {exerciseVolume > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Volume: {exerciseVolume.toLocaleString()} kg
        </p>
      )}
    </div>
  );
}
