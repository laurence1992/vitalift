import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, ChevronRight } from "lucide-react";
import { getRecentWorkouts } from "@/lib/storage";
import { workoutDays } from "@/data/exercises";
import { format } from "date-fns";

type AssignedProgram = {
  id: string;
  name: string;
  days: { id: string; label: string; day_note: string; exerciseCount: number }[];
};

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignedProgram, setAssignedProgram] = useState<AssignedProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const recent = getRecentWorkouts(5);

  useEffect(() => {
    loadAssignedProgram();
  }, [user]);

  const loadAssignedProgram = async () => {
    if (!user) { setLoading(false); return; }

    const { data: assignment } = await supabase
      .from("client_program_assignments")
      .select("program_id")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment?.program_id) { setLoading(false); return; }

    const { data: prog } = await supabase
      .from("programs")
      .select("id, name")
      .eq("id", assignment.program_id)
      .maybeSingle();

    if (!prog) { setLoading(false); return; }

    const { data: days } = await supabase
      .from("program_days")
      .select("id, label, day_note")
      .eq("program_id", prog.id)
      .order("sort_order");

    const daysList = [];
    for (const d of days || []) {
      const { count } = await supabase
        .from("program_exercises")
        .select("id", { count: "exact", head: true })
        .eq("program_day_id", d.id);
      daysList.push({ id: d.id, label: d.label, day_note: d.day_note || "", exerciseCount: count || 0 });
    }

    setAssignedProgram({ id: prog.id, name: prog.name, days: daysList });
    setLoading(false);
  };

  // If coach has assigned a program, show that instead of static days
  const hasAssignedProgram = assignedProgram && assignedProgram.days.length > 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Dumbbell className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">VitaLift</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {hasAssignedProgram ? assignedProgram.name : "Stronger Every Session. 💪"}
        </p>
      </div>

      <div className="px-5 -mt-4 space-y-6">
        {/* Day selection */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : hasAssignedProgram ? (
          <div className="grid grid-cols-2 gap-3">
            {assignedProgram.days.map((day) => (
              <button
                key={day.id}
                onClick={() => navigate(`/workout/program/${day.id}`)}
                className="flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all active:scale-[0.97]"
              >
                <span className="text-xs font-semibold uppercase text-primary">{day.label}</span>
                {day.day_note && <span className="mt-1 text-sm font-medium">{day.day_note}</span>}
                <span className="mt-2 text-xs text-muted-foreground">
                  {day.exerciseCount} exercises
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {workoutDays.map((day) => (
              <button
                key={day.id}
                onClick={() => navigate(`/workout/${day.id}`)}
                className="flex flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all active:scale-[0.97]"
              >
                <span className="text-xs font-semibold uppercase text-primary">{day.label}</span>
                <span className="mt-1 text-sm font-medium">{day.subtitle}</span>
                <span className="mt-2 text-xs text-muted-foreground">
                  {day.exercises.length} exercises
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recent workouts */}
        {recent.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {recent.map((w) => {
                const day = workoutDays.find((d) => d.id === w.dayId);
                const totalVolume = w.exercises.reduce(
                  (sum, ex) =>
                    sum + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
                  0
                );
                return (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/history/${w.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-all active:scale-[0.98]"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {day?.label} – {day?.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(w.date), "MMM d, yyyy")}
                        {totalVolume > 0 && ` · ${totalVolume.toLocaleString()} kg vol`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
