import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, TrendingUp, MessageSquare, Archive, RotateCcw, Edit, Dumbbell, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import ProgramBuilder from "./ProgramBuilder";

type ClientData = { id: string; name: string; email: string; status: string };
type WorkoutRow = { id: string; day_id: string; date: string; session_notes: string | null; duration_seconds: number | null };
type WorkoutSetRow = { exercise_id: string; set_number: number; weight: number | null; reps: number | null };
type ProgressRow = { id: string; date: string; bodyweight: number | null; notes: string | null };
type ProgramInfo = { id: string; name: string; updated_at: string };

export default function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(null);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetRow[]>([]);
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});

  const load = async () => {
    if (!clientId) return;
    const [clientRes, workoutsRes, progressRes, assignmentRes] = await Promise.all([
      supabase.from("profiles").select("id, name, email, status").eq("id", clientId).maybeSingle(),
      supabase.from("workouts").select("*").eq("client_id", clientId).order("date", { ascending: false }),
      supabase.from("progress_entries").select("*").eq("client_id", clientId).order("date", { ascending: true }),
      supabase.from("client_program_assignments").select("program_id").eq("client_id", clientId).eq("is_active", true).maybeSingle(),
    ]);
    setClient(clientRes.data as ClientData | null);
    setWorkouts((workoutsRes.data as WorkoutRow[]) || []);
    setProgress((progressRes.data as ProgressRow[]) || []);
    if (assignmentRes.data?.program_id) {
      const { data: prog } = await supabase.from("programs").select("id, name, updated_at").eq("id", assignmentRes.data.program_id).maybeSingle();
      setProgram(prog as ProgramInfo | null);
    } else { setProgram(null); }
    const { data: exes } = await supabase.from("coach_exercises").select("id, name").eq("coach_id", user?.id || "");
    if (exes) {
      const map: Record<string, string> = {};
      exes.forEach((e: any) => { map[e.id] = e.name; });
      setExerciseNames(map);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  const weightData = progress.filter((p) => p.bodyweight).map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    weight: p.bodyweight,
  }));

  const handleMessage = async () => {
    if (!user || !clientId) return;
    const { data: existing } = await supabase.from("conversations").select("id").eq("coach_id", user.id).eq("client_id", clientId).maybeSingle();
    if (existing) { navigate(`/inbox/${existing.id}`); }
    else {
      const { data: created } = await supabase.from("conversations").insert({ coach_id: user.id, client_id: clientId }).select("id").single();
      if (created) navigate(`/inbox/${created.id}`);
    }
  };

  const handleArchiveToggle = async () => {
    if (!client) return;
    const newStatus = client.status === "archived" ? "active" : "archived";
    await supabase.from("profiles").update({ status: newStatus, archived_at: newStatus === "archived" ? new Date().toISOString() : null } as any).eq("id", client.id);
    toast({ title: newStatus === "archived" ? "Client archived" : "Client restored" });
    load();
  };

  const viewWorkoutDetail = async (workoutId: string) => {
    setSelectedWorkout(workoutId);
    const { data } = await supabase.from("workout_sets").select("*").eq("workout_id", workoutId).order("set_number");
    setWorkoutSets((data as WorkoutSetRow[]) || []);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  };

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
          <button onClick={() => setShowBuilder(false)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold text-foreground">{program ? "Edit Program" : "Create Program"}</h1>
        </div>
        <div className="px-4 pt-4">
          <ProgramBuilder clientId={clientId!} programId={program?.id} onSaved={() => { setShowBuilder(false); load(); }} />
        </div>
      </div>
    );
  }

  // Workout detail view
  if (selectedWorkout) {
    const workout = workouts.find((w) => w.id === selectedWorkout);
    const byExercise: Record<string, WorkoutSetRow[]> = {};
    workoutSets.forEach((s) => {
      if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = [];
      byExercise[s.exercise_id].push(s);
    });

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
          <button onClick={() => setSelectedWorkout(null)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">Workout Detail</h1>
            {workout && <p className="text-xs text-muted-foreground">{format(new Date(workout.date), "MMM d, yyyy")} · {formatDuration(workout.duration_seconds)}</p>}
          </div>
        </div>
        <div className="px-4 pt-4 space-y-3">
          {Object.entries(byExercise).map(([exId, sets]) => {
            const volume = sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
            return (
              <div key={exId} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground mb-1">{exerciseNames[exId] || exId}</p>
                {volume > 0 && <p className="text-xs text-muted-foreground mb-2">Volume: {volume.toLocaleString()} kg</p>}
                <div className="space-y-1">
                  {sets.map((s, i) => (
                    <div key={i} className="flex gap-4 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-foreground">
                      <span className="w-8 text-xs font-bold text-muted-foreground">Set {s.set_number}</span>
                      <span>{s.weight ?? "–"} kg</span>
                      <span>× {s.reps ?? "–"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {workout?.session_notes && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{workout.session_notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">{client?.name && client.name.trim() ? client.name : "Unnamed Client"}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Client actions */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5" onClick={handleMessage}>
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handleArchiveToggle}>
            {client?.status === "archived" ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {client?.status === "archived" ? "Restore" : "Archive"}
          </Button>
        </div>

        {/* Assigned Program */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Assigned Program</h2>
            </div>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setShowBuilder(true)}>
              <Edit className="h-3 w-3" />
              {program ? "Edit" : "Create"}
            </Button>
          </div>
          {program ? (
            <div>
              <p className="text-sm font-medium text-foreground">{program.name}</p>
              <p className="text-xs text-muted-foreground">Updated {format(new Date(program.updated_at), "MMM d, yyyy")}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No program assigned yet. Click Create to build one.</p>
          )}
        </div>

        {/* Weight trend */}
        {weightData.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Weight Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Workout history */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Workout History</h2>
          {workouts.length === 0 && <p className="text-sm text-muted-foreground">No workouts yet.</p>}
          <div className="space-y-2">
            {workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => viewWorkoutDetail(w.id)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{w.day_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(w.date), "MMM d, yyyy")}
                    {w.duration_seconds ? ` · ${formatDuration(w.duration_seconds)}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Progress entries */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Progress Entries</h2>
          {progress.length === 0 && <p className="text-sm text-muted-foreground">No progress entries yet.</p>}
          <div className="space-y-2">
            {progress.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{format(new Date(p.date), "MMM d, yyyy")}</p>
                {p.bodyweight && <p className="text-xs text-muted-foreground">{p.bodyweight} kg</p>}
                {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
