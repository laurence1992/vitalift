import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SetTarget = {
  set_index: number;
  target_reps: string | null;
  target_weight: number | null;
  rest_seconds: number | null;
  coach_note: string;
};

type ExerciseData = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  image_url: string | null;
  video_url: string | null;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number | null;
  coach_notes: string;
  sets: SetTarget[];
};

type SetLog = {
  set_index: number;
  weight: number | null;
  reps: number | null;
};

export default function ProgramWorkoutSession() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dayLabel, setDayLabel] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [startTime] = useState(() => new Date().toISOString());
  const [programId, setProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDay();
  }, [dayId]);

  const loadDay = async () => {
    if (!dayId) return;

    const { data: day } = await supabase
      .from("program_days")
      .select("*, programs(id)")
      .eq("id", dayId)
      .maybeSingle();

    if (!day) { setLoading(false); return; }
    setDayLabel(day.label);
    setDayNote(day.day_note || "");
    setProgramId((day as any).programs?.id || null);

    const { data: peData } = await supabase
      .from("program_exercises")
      .select("*, coach_exercises(name, image_url, video_url)")
      .eq("program_day_id", dayId)
      .order("sort_order");

    const exList: ExerciseData[] = [];
    const logMap: Record<string, SetLog[]> = {};

    for (const pe of peData || []) {
      const { data: setsData } = await supabase
        .from("program_exercise_sets")
        .select("*")
        .eq("program_exercise_id", pe.id)
        .order("set_index");

      const sets: SetTarget[] = (setsData || []).map((s: any) => ({
        set_index: s.set_index,
        target_reps: s.target_reps,
        target_weight: s.target_weight,
        rest_seconds: s.rest_seconds,
        coach_note: s.coach_note || "",
      }));

      // If no per-set data, generate from exercise-level targets
      if (sets.length === 0) {
        for (let i = 1; i <= pe.target_sets; i++) {
          sets.push({ set_index: i, target_reps: null, target_weight: null, rest_seconds: null, coach_note: "" });
        }
      }

      const ex: ExerciseData = {
        id: pe.id,
        exercise_id: pe.exercise_id,
        exercise_name: (pe as any).coach_exercises?.name || "Unknown",
        image_url: (pe as any).coach_exercises?.image_url || null,
        video_url: (pe as any).coach_exercises?.video_url || null,
        target_sets: pe.target_sets,
        target_reps: pe.target_reps || "",
        target_weight: pe.target_weight,
        rest_seconds: pe.rest_seconds,
        coach_notes: pe.coach_notes || "",
        sets,
      };
      exList.push(ex);

      logMap[pe.id] = sets.map((s) => ({
        set_index: s.set_index,
        weight: null,
        reps: null,
      }));
    }

    setExercises(exList);
    setExerciseLogs(logMap);
    setLoading(false);
  };

  const totalVolume = useMemo(() => {
    return Object.values(exerciseLogs).reduce(
      (total, sets) =>
        total + sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
      0
    );
  }, [exerciseLogs]);

  const updateSet = (peId: string, setIdx: number, field: "weight" | "reps", value: string) => {
    setExerciseLogs((prev) => {
      const sets = [...(prev[peId] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value === "" ? null : Number(value) };
      return { ...prev, [peId]: sets };
    });
  };

  const finishWorkout = async () => {
    if (!user || !dayId) return;

    const endTime = new Date().toISOString();
    const durationSeconds = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);

    const { data: dbWorkout } = await supabase
      .from("workouts")
      .insert({
        client_id: user.id,
        day_id: dayId,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: durationSeconds,
        session_notes: sessionNotes,
      })
      .select()
      .single();

    if (dbWorkout) {
      const setRows = exercises.flatMap((ex) => {
        const logs = exerciseLogs[ex.id] || [];
        return logs
          .filter((s) => s.weight != null || s.reps != null)
          .map((s) => ({
            workout_id: dbWorkout.id,
            exercise_id: ex.exercise_id,
            set_number: s.set_index,
            weight: s.weight,
            reps: s.reps,
          }));
      });
      if (setRows.length > 0) {
        await supabase.from("workout_sets").insert(setRows);
      }
    }

    navigate("/history");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold">{dayLabel}</h1>
          <p className="text-xs text-muted-foreground">{exercises.length} exercises</p>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {dayNote && (
          <p className="text-xs text-primary/80 italic text-center rounded-lg bg-primary/5 px-3 py-2">
            {dayNote}
          </p>
        )}

        {exercises.map((ex) => {
          const sets = exerciseLogs[ex.id] || [];
          const exVolume = sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);

          return (
            <div key={ex.id} className="rounded-xl border border-border bg-card overflow-hidden p-4 space-y-3">
              <h3 className="text-lg font-bold text-foreground">{ex.exercise_name}</h3>

              {ex.coach_notes && (
                <p className="text-xs text-primary/80 bg-primary/5 rounded-lg px-2 py-1">{ex.coach_notes}</p>
              )}

              {ex.image_url && (
                <div className="flex items-center justify-center rounded-lg bg-muted/30 p-2">
                  <img src={ex.image_url} alt={ex.exercise_name} className="w-full max-h-[200px] rounded-md object-contain" />
                </div>
              )}

              {ex.video_url && ex.video_url.trim() !== "" && (
                <a
                  href={ex.video_url.trim().startsWith("http") ? ex.video_url.trim() : `https://${ex.video_url.trim()}`}
                  target="_self"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground no-underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch Demo
                </a>
              )}

              <p className="text-xs text-muted-foreground">
                Target: {ex.target_sets} × {ex.target_reps}
                {ex.target_weight ? ` @ ${ex.target_weight}kg` : ""}
                {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
              </p>

              {/* Set inputs */}
              <div className="space-y-2">
                <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-xs font-semibold text-muted-foreground px-1">
                  <span>Set</span>
                  <span>Weight (kg)</span>
                  <span>Reps</span>
                </div>
                {sets.map((set, i) => {
                  const setTarget = ex.sets[i];
                  return (
                    <div key={i}>
                      <div className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
                        <span className="text-center text-sm font-bold text-muted-foreground">{set.set_index}</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder={setTarget?.target_weight?.toString() || "0"}
                          value={set.weight ?? ""}
                          onChange={(e) => updateSet(ex.id, i, "weight", e.target.value)}
                          className="h-10 bg-background text-center text-foreground caret-foreground [&]:[-webkit-text-fill-color:hsl(var(--foreground))] placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))]"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          placeholder={setTarget?.target_reps || "0"}
                          value={set.reps ?? ""}
                          onChange={(e) => updateSet(ex.id, i, "reps", e.target.value)}
                          className="h-10 bg-background text-center text-foreground caret-foreground [&]:[-webkit-text-fill-color:hsl(var(--foreground))] placeholder:text-muted-foreground placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))]"
                        />
                      </div>
                      {/* Per-set coach note */}
                      {setTarget?.coach_note && (
                        <p className="text-[10px] text-primary/70 italic ml-[48px] mt-0.5">
                          💬 {setTarget.coach_note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {exVolume > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  Volume: {exVolume.toLocaleString()} kg
                </p>
              )}
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
