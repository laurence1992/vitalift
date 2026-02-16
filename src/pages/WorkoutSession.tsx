import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, ChevronDown, ChevronUp } from "lucide-react";
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
} from "@/lib/storage";
import { cn } from "@/lib/utils";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseTargetSets(ts: number | string): number {
  if (typeof ts === "number") return ts;
  // e.g. "2–3" → use the higher value
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
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    // Initialize set logs
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
    if (day.exercises.length > 0) setExpandedExercise(`${day.exercises[0].id}-0`);
  }, [day]);

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
        <div>
          <h1 className="text-base font-bold">{day.label} – {day.subtitle}</h1>
          <p className="text-xs text-muted-foreground">{day.exercises.length} exercises</p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {day.exercises.map((ex, exIdx) => {
          const exKey = `${ex.id}-${exIdx}`;
          const isExpanded = expandedExercise === exKey;
          const lastSets = getLastSetsForExercise(ex.id, workoutId);
          const sets = exerciseLogs[exKey] || [];

          return (
            <ExerciseCard
              key={exKey}
              exercise={ex}
              isExpanded={isExpanded}
              onToggle={() => setExpandedExercise(isExpanded ? null : exKey)}
              sets={sets}
              lastSets={lastSets}
              onUpdateSet={(setIdx, field, value) => updateSet(exKey, setIdx, field, value)}
            />
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

        <Button onClick={finishWorkout} className="w-full h-12 text-base font-semibold" size="lg">
          <Check className="mr-2 h-5 w-5" />
          Finish Workout
        </Button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  isExpanded,
  onToggle,
  sets,
  lastSets,
  onUpdateSet,
}: {
  exercise: DayExercise;
  isExpanded: boolean;
  onToggle: () => void;
  sets: SetLog[];
  lastSets: SetLog[] | null;
  onUpdateSet: (setIdx: number, field: "weight" | "reps", value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {exercise.image ? (
          <img
            src={exercise.image}
            alt={exercise.name}
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            {exercise.name.slice(0, 2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{exercise.name}</p>
          <p className="text-xs text-muted-foreground">
            {exercise.targetSets} × {exercise.targetReps}
          </p>
          {exercise.notes && (
            <p className="text-xs text-primary/80 mt-0.5">{exercise.notes}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Watch Demo */}
          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Watch Demo
            </a>
          )}

          {/* Last Time */}
          {lastSets ? (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Last Time
              </p>
              <div className="flex flex-wrap gap-2">
                {lastSets.map((s, i) => (
                  <span key={i} className="rounded-md bg-background px-2 py-1 text-xs">
                    {s.weight ?? "–"}kg × {s.reps ?? "–"}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No previous workout logged yet</p>
          )}

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
        </div>
      )}
    </div>
  );
}
