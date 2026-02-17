import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { workoutDays } from "@/data/exercises";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ClientData = { id: string; name: string; email: string };
type WorkoutRow = { id: string; day_id: string; date: string; session_notes: string | null };
type ProgressRow = { id: string; date: string; bodyweight: number | null; notes: string | null };

export default function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles").select("id, name, email").eq("id", clientId).maybeSingle()
      .then(({ data }) => setClient(data as ClientData | null));
    supabase.from("workouts").select("*").eq("client_id", clientId).order("date", { ascending: false })
      .then(({ data }) => setWorkouts((data as WorkoutRow[]) || []));
    supabase.from("progress_entries").select("*").eq("client_id", clientId).order("date", { ascending: true })
      .then(({ data }) => setProgress((data as ProgressRow[]) || []));
  }, [clientId]);

  const weightData = progress.filter((p) => p.bodyweight).map((p) => ({
    date: format(new Date(p.date), "MMM d"),
    weight: p.bodyweight,
  }));

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">{client?.name || client?.email || "Client"}</h1>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Weight trend */}
        {weightData.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Weight Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Workout history */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Workout History
          </h2>
          {workouts.length === 0 && <p className="text-sm text-muted-foreground">No workouts yet.</p>}
          <div className="space-y-2">
            {workouts.map((w) => {
              const day = workoutDays.find((d) => d.id === w.day_id);
              return (
                <div key={w.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-sm font-medium">{day?.label} – {day?.subtitle}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(w.date), "MMM d, yyyy")}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress entries */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Progress Entries
          </h2>
          {progress.length === 0 && <p className="text-sm text-muted-foreground">No progress entries yet.</p>}
          <div className="space-y-2">
            {progress.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-sm font-medium">{format(new Date(p.date), "MMM d, yyyy")}</p>
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
