import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight } from "lucide-react";
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

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [dayLabels, setDayLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadWorkouts();
  }, [user]);

  const loadWorkouts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("client_id", user.id)
      .order("date", { ascending: false });

    const rows = (data as WorkoutRow[]) || [];
    setWorkouts(rows);

    // Resolve day labels from program_days
    const dayIds = [...new Set(rows.map((w) => w.day_id))];
    if (dayIds.length > 0) {
      const { data: days } = await supabase
        .from("program_days")
        .select("id, label, day_note")
        .in("id", dayIds);
      const labels: Record<string, string> = {};
      (days || []).forEach((d: any) => {
        labels[d.id] = d.day_note ? `${d.label} – ${d.day_note}` : d.label;
      });
      setDayLabels(labels);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    return `${m}m`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Clock className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Workout History</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-2">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="mb-3 h-10 w-10" />
            <p className="text-sm">No workouts yet</p>
            <p className="text-xs">Complete a workout to see it here</p>
          </div>
        ) : (
          workouts.map((w) => (
            <button
              key={w.id}
              onClick={() => navigate(`/history/${w.id}`)}
              className="flex w-full items-center justify-between rounded-xl bg-primary text-white px-4 py-3 text-left hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <div>
                <p className="text-sm font-semibold text-white">{dayLabels[w.day_id] || w.day_id}</p>
                <p className="text-xs text-white/70">
                  {format(new Date(w.date), "EEEE, MMM d, yyyy")}
                  {w.duration_seconds ? ` · ${formatDuration(w.duration_seconds)}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
