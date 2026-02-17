import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

type WorkoutRow = {
  id: string;
  day_id: string;
  date: string;
  duration_seconds: number | null;
  session_notes: string | null;
};

type WorkoutSetRow = {
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
};

export default function WorkoutSummary() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [sets, setSets] = useState<WorkoutSetRow[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});
  const [dayLabel, setDayLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workoutId || !user) return;
    loadWorkout();
  }, [workoutId, user]);

  const loadWorkout = async () => {
    if (!workoutId) return;

    const { data: w } = await supabase
      .from("workouts")
      .select("*")
      .eq("id", workoutId)
      .maybeSingle();

    if (!w) { setLoading(false); return; }
    setWorkout(w as WorkoutRow);

    // Resolve day label
    const { data: day } = await supabase
      .from("program_days")
      .select("label, day_note")
      .eq("id", w.day_id)
      .maybeSingle();
    if (day) {
      setDayLabel(day.day_note ? `${day.label} – ${day.day_note}` : day.label);
    } else {
      setDayLabel(w.day_id);
    }

    // Load sets
    const { data: setsData } = await supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_id", workoutId)
      .order("set_number");
    setSets((setsData as WorkoutSetRow[]) || []);

    // Resolve exercise names from coach_exercises
    const exerciseIds = [...new Set((setsData || []).map((s: any) => s.exercise_id))];
    if (exerciseIds.length > 0) {
      const { data: exes } = await supabase
        .from("coach_exercises")
        .select("id, name")
        .in("id", exerciseIds);
      const names: Record<string, string> = {};
      (exes || []).forEach((e: any) => { names[e.id] = e.name; });
      setExerciseNames(names);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  // Group sets by exercise
  const byExercise: Record<string, WorkoutSetRow[]> = {};
  sets.forEach((s) => {
    if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = [];
    byExercise[s.exercise_id].push(s);
  });

  const totalVolume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate("/workouts")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold">{dayLabel}</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(workout.date), "EEEE, MMM d, yyyy")}
            {workout.duration_seconds ? ` · ${formatDuration(workout.duration_seconds)}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        {totalVolume > 0 && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold text-primary">{totalVolume.toLocaleString()} kg</p>
          </div>
        )}

        {Object.entries(byExercise).map(([exId, exSets]) => {
          const volume = exSets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
          const bestSet = exSets.reduce<{ weight: number; reps: number } | null>(
            (best, s) => {
              if (s.weight == null || s.reps == null) return best;
              if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps))
                return { weight: s.weight, reps: s.reps };
              return best;
            },
            null
          );

          return (
            <div key={exId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{exerciseNames[exId] || exId}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {volume > 0 && <span>Vol: {volume.toLocaleString()} kg</span>}
                    {bestSet && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-primary" />
                        {bestSet.weight}kg × {bestSet.reps}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {exSets.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
                    <span className="w-8 text-xs font-bold text-muted-foreground">Set {s.set_number}</span>
                    <span>{s.weight ?? "–"} kg</span>
                    <span>× {s.reps ?? "–"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {workout.session_notes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{workout.session_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
