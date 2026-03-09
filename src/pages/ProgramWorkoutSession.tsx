import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check, Trophy, Timer, Play } from "lucide-react";
import { formatCardioInterval } from "@/pages/coach/ExerciseLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { resolveExerciseImage } from "@/lib/exercise-image-map";
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
  category: string;
  target_sets: number;
  target_reps: string;
  target_weight: number | null;
  rest_seconds: number | null;
  coach_notes: string;
  sets: SetTarget[];
  work_seconds: number | null;
  cardio_rest_seconds: number | null;
  rounds: number | null;
};

type SetLog = {
  set_index: number;
  weight: number | null;
  reps: number | null;
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export default function ProgramWorkoutSession() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dayLabel, setDayLabel] = useState("");
  const [dayNote, setDayNote] = useState("");
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, SetLog[]>>({});
  const [sessionNotes, setSessionNotes] = useState("");
  const [programId, setProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Personal bests
  const [personalBests, setPersonalBests] = useState<Record<string, { weight: number; reps: number | null }>>({});

  // Completion modal state
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionPBs, setCompletionPBs] = useState<{ exerciseName: string; weight: number }[]>([]);
  const [finalDuration, setFinalDuration] = useState(0);

  useEffect(() => {
    loadDay();
    if (user) loadPersonalBests();
  }, [dayId, user]);

  // Timer tick
  useEffect(() => {
    if (workoutStarted && startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutStarted, startTime]);

  const handleStartWorkout = () => {
    const now = new Date().toISOString();
    setStartTime(now);
    setWorkoutStarted(true);
  };

  const loadPersonalBests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("personal_bests")
      .select("exercise_id, weight, reps")
      .eq("user_id", user.id);
    const map: Record<string, { weight: number; reps: number | null }> = {};
    for (const pb of data || []) {
      map[pb.exercise_id] = { weight: Number(pb.weight), reps: pb.reps };
    }
    setPersonalBests(map);
  };

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
      .select("*, coach_exercises(name, image_url, video_url, category, work_seconds, rest_seconds, rounds)")
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

      if (sets.length === 0) {
        for (let i = 1; i <= pe.target_sets; i++) {
          sets.push({ set_index: i, target_reps: null, target_weight: null, rest_seconds: null, coach_note: "" });
        }
      }

      const ceData = (pe as any).coach_exercises;
      const ex: ExerciseData = {
        id: pe.id,
        exercise_id: pe.exercise_id,
        exercise_name: ceData?.name || "Unknown",
        image_url: ceData?.image_url || null,
        video_url: ceData?.video_url || null,
        category: ceData?.category || "",
        target_sets: pe.target_sets,
        target_reps: pe.target_reps || "",
        target_weight: pe.target_weight,
        rest_seconds: pe.rest_seconds,
        coach_notes: pe.coach_notes || "",
        sets,
        work_seconds: ceData?.work_seconds || null,
        cardio_rest_seconds: ceData?.rest_seconds || null,
        rounds: ceData?.rounds || null,
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

  const checkAndSavePBs = async (): Promise<{ exerciseName: string; weight: number }[]> => {
    if (!user) return [];
    const newPBs: { exerciseName: string; weight: number }[] = [];

    for (const ex of exercises) {
      if (ex.category === "Cardio") continue;
      const logs = exerciseLogs[ex.id] || [];
      let bestWeight = 0;
      let bestReps = 0;
      for (const s of logs) {
        if (s.weight != null && s.weight > 0) {
          if (s.weight > bestWeight || (s.weight === bestWeight && (s.reps ?? 0) > bestReps)) {
            bestWeight = s.weight;
            bestReps = s.reps ?? 0;
          }
        }
      }
      if (bestWeight <= 0) continue;

      const currentPB = personalBests[ex.exercise_id];
      const isNewPB = !currentPB || bestWeight > currentPB.weight || (bestWeight === currentPB.weight && bestReps > (currentPB.reps ?? 0));

      if (isNewPB) {
        newPBs.push({ exerciseName: ex.exercise_name, weight: bestWeight });
        await supabase
          .from("personal_bests")
          .upsert(
            { user_id: user.id, exercise_id: ex.exercise_id, weight: bestWeight, reps: bestReps, achieved_at: new Date().toISOString() },
            { onConflict: "user_id,exercise_id" }
          );
      }
    }

    return newPBs;
  };

  const updateSet = (peId: string, setIdx: number, field: "weight" | "reps", value: string) => {
    setExerciseLogs((prev) => {
      const sets = [...(prev[peId] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value === "" ? null : Number(value) };
      return { ...prev, [peId]: sets };
    });
  };

  const finishWorkout = async () => {
    if (!user || !dayId || !startTime) return;

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

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

    const pbs = await checkAndSavePBs();
    setFinalDuration(durationSeconds);
    setCompletionPBs(pbs);
    setShowCompletion(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="flex items-center gap-3 px-5 py-3">
          <button onClick={() => navigate(-1)} className="text-foreground active:scale-[0.97]">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground">{dayLabel}</h1>
            <p className="text-xs text-muted-foreground">{exercises.length} exercises</p>
          </div>
        </div>

        {/* Sticky timer bar — visible once workout started */}
        {workoutStarted && (
          <div className="flex items-center justify-center gap-2 border-t border-primary/20 bg-primary/5 px-5 py-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold tabular-nums text-primary tracking-wider">
              {formatElapsed(elapsed)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4 px-5 pt-4">
        {/* Start Workout button — shown before workout begins */}
        {!workoutStarted && (
          <Button
            onClick={handleStartWorkout}
            className="w-full h-14 text-base font-semibold gap-2"
            size="lg"
          >
            <Play className="h-5 w-5" />
            Start Workout
          </Button>
        )}

        {dayNote && (
          <p className="text-xs text-primary italic text-center rounded-2xl bg-primary/5 border border-primary/20 px-3 py-2">
            {dayNote}
          </p>
        )}

        {exercises.map((ex) => {
          const sets = exerciseLogs[ex.id] || [];
          const exVolume = sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);

          return (
            <div key={ex.id} className="rounded-2xl border border-border bg-card overflow-hidden p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{ex.exercise_name}</h3>

              {ex.coach_notes && (
                <p className="text-xs text-primary bg-primary/5 border border-primary/20 rounded-xl px-2 py-1">{ex.coach_notes}</p>
              )}

              {ex.image_url && (
                <div className="flex items-center justify-center rounded-xl bg-secondary p-2">
                  <img src={resolveExerciseImage(ex.image_url)} alt={ex.exercise_name} className="w-full max-h-[200px] rounded-xl object-contain" />
                </div>
              )}

              {ex.video_url && ex.video_url.trim() !== "" && (
                <a
                  href={ex.video_url.trim().startsWith("http") ? ex.video_url.trim() : `https://${ex.video_url.trim()}`}
                  target="_self"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground no-underline active:scale-[0.97]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch Demo
                </a>
              )}

              {ex.category === "Cardio" && ex.work_seconds ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="h-4 w-4" />
                    <p className="text-sm font-semibold">
                      {formatCardioInterval({ work_seconds: ex.work_seconds, rest_seconds: ex.cardio_rest_seconds, rounds: ex.rounds })}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Target: {ex.target_sets} × {ex.target_reps}
                    {ex.target_weight ? ` @ ${ex.target_weight}kg` : ""}
                    {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                  </p>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
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
                              className="h-10 text-center"
                              disabled={!workoutStarted}
                            />
                            <Input
                              type="number"
                              inputMode="numeric"
                              placeholder={setTarget?.target_reps || "0"}
                              value={set.reps ?? ""}
                              onChange={(e) => updateSet(ex.id, i, "reps", e.target.value)}
                              className="h-10 text-center"
                              disabled={!workoutStarted}
                            />
                          </div>
                          {setTarget?.coach_note && (
                            <p className="text-[10px] text-primary italic ml-[48px] mt-0.5">
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
                </>
              )}
            </div>
          );
        })}

        {workoutStarted && (
          <>
            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Session Notes</label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="How did it feel? Any PRs?"
                className="min-h-[80px]"
              />
            </div>

            {totalVolume > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Volume</p>
                <p className="text-3xl font-bold text-primary">{totalVolume.toLocaleString()} kg</p>
              </div>
            )}

            <Button onClick={finishWorkout} className="w-full h-12 text-base font-semibold" size="lg">
              <Check className="mr-2 h-5 w-5" />
              Finish Workout
            </Button>
          </>
        )}
      </div>

      {/* Workout Completion Modal */}
      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "#0D0D18" }}>
          <div className="flex flex-col items-center text-center px-8 max-w-sm w-full">
            <Trophy className="h-16 w-16 text-primary mb-6" />

            <h1 className="text-2xl font-bold text-foreground mb-2">Workout Complete 💪</h1>

            <p className="text-sm text-muted-foreground mb-6">
              Duration: {formatElapsed(finalDuration)}
            </p>

            {completionPBs.length > 0 ? (
              <div className="w-full mb-8">
                <h2 className="text-lg font-bold mb-1" style={{ color: "#10B981" }}>
                  Personal Bests Smashed!
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You crushed {completionPBs.length} personal best{completionPBs.length > 1 ? "s" : ""} today!
                </p>
                <div className="space-y-2">
                  {completionPBs.map((pb, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)" }}
                    >
                      <span className="text-sm font-semibold text-foreground">{pb.exerciseName}</span>
                      <span className="text-sm font-bold" style={{ color: "#10B981" }}>{pb.weight}kg</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-8">
                Great effort — keep pushing and the records will fall! 🔥
              </p>
            )}

            <Button
              onClick={() => navigate("/workouts")}
              className="w-full h-14 text-base font-semibold"
              size="lg"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
