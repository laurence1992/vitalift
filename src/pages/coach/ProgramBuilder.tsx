import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ExerciseLibrary, { type CoachExercise } from "./ExerciseLibrary";

type ProgramExerciseSet = {
  id?: string;
  set_index: number;
  target_reps: string;
  target_weight: string;
  rest_seconds: string;
  coach_note: string;
};

type ProgramExercise = {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  sort_order: number;
  target_sets: number;
  target_reps: string;
  target_weight: string;
  rest_seconds: string;
  coach_notes: string;
  sets: ProgramExerciseSet[];
};

type ProgramDay = {
  id?: string;
  label: string;
  sort_order: number;
  day_note: string;
  exercises: ProgramExercise[];
};

type Props = {
  clientId: string;
  programId?: string | null;
  onSaved: () => void;
};

export default function ProgramBuilder({ clientId, programId, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [targetDayIdx, setTargetDayIdx] = useState(0);

  // Load existing program
  useEffect(() => {
    if (!programId) {
      // Default: create 4 empty days
      setDays([
        { label: "Day 1", sort_order: 0, day_note: "", exercises: [] },
        { label: "Day 2", sort_order: 1, day_note: "", exercises: [] },
        { label: "Day 3", sort_order: 2, day_note: "", exercises: [] },
        { label: "Day 4", sort_order: 3, day_note: "", exercises: [] },
      ]);
      return;
    }
    loadProgram();
  }, [programId]);

  const loadProgram = async () => {
    if (!programId) return;
    const { data: prog } = await supabase
      .from("programs")
      .select("*")
      .eq("id", programId)
      .maybeSingle();
    if (!prog) return;
    setName(prog.name);
    setDescription(prog.description || "");

    const { data: daysData } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_id", programId)
      .order("sort_order");

    const loadedDays: ProgramDay[] = [];
    for (const d of daysData || []) {
      const { data: exData } = await supabase
        .from("program_exercises")
        .select("*, coach_exercises(name)")
        .eq("program_day_id", d.id)
        .order("sort_order");

      const exercises: ProgramExercise[] = [];
      for (const pe of exData || []) {
        const { data: setsData } = await supabase
          .from("program_exercise_sets")
          .select("*")
          .eq("program_exercise_id", pe.id)
          .order("set_index");

        exercises.push({
          id: pe.id,
          exercise_id: pe.exercise_id,
          exercise_name: (pe as any).coach_exercises?.name || "Unknown",
          sort_order: pe.sort_order,
          target_sets: pe.target_sets,
          target_reps: pe.target_reps || "",
          target_weight: pe.target_weight?.toString() || "",
          rest_seconds: pe.rest_seconds?.toString() || "",
          coach_notes: pe.coach_notes || "",
          sets: (setsData || []).map((s: any) => ({
            id: s.id,
            set_index: s.set_index,
            target_reps: s.target_reps || "",
            target_weight: s.target_weight?.toString() || "",
            rest_seconds: s.rest_seconds?.toString() || "",
            coach_note: s.coach_note || "",
          })),
        });
      }

      loadedDays.push({
        id: d.id,
        label: d.label,
        sort_order: d.sort_order,
        day_note: d.day_note || "",
        exercises,
      });
    }
    setDays(loadedDays);
  };

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { label: `Day ${prev.length + 1}`, sort_order: prev.length, day_note: "", exercises: [] },
    ]);
  };

  const openExercisePicker = (dayIdx: number) => {
    setTargetDayIdx(dayIdx);
    setExercisePickerOpen(true);
  };

  const addExerciseToDay = (exercise: CoachExercise) => {
    setDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[targetDayIdx] };
      const defaultSets = 3;
      day.exercises = [
        ...day.exercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          sort_order: day.exercises.length,
          target_sets: defaultSets,
          target_reps: "8-12",
          target_weight: "",
          rest_seconds: "",
          coach_notes: "",
          sets: Array.from({ length: defaultSets }, (_, i) => ({
            set_index: i + 1,
            target_reps: "",
            target_weight: "",
            rest_seconds: "",
            coach_note: "",
          })),
        },
      ];
      updated[targetDayIdx] = day;
      return updated;
    });
    setExercisePickerOpen(false);
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: string, value: any) => {
    setDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[dayIdx] };
      const exercises = [...day.exercises];
      const ex = { ...exercises[exIdx], [field]: value };

      // Sync sets array length with target_sets
      if (field === "target_sets") {
        const numSets = Number(value) || 1;
        const currentSets = [...ex.sets];
        if (numSets > currentSets.length) {
          for (let i = currentSets.length; i < numSets; i++) {
            currentSets.push({ set_index: i + 1, target_reps: "", target_weight: "", rest_seconds: "", coach_note: "" });
          }
        } else {
          currentSets.length = numSets;
        }
        ex.sets = currentSets;
      }

      exercises[exIdx] = ex;
      day.exercises = exercises;
      updated[dayIdx] = day;
      return updated;
    });
  };

  const updateSet = (dayIdx: number, exIdx: number, setIdx: number, field: string, value: string) => {
    setDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[dayIdx] };
      const exercises = [...day.exercises];
      const ex = { ...exercises[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.sets = sets;
      exercises[exIdx] = ex;
      day.exercises = exercises;
      updated[dayIdx] = day;
      return updated;
    });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[dayIdx] };
      day.exercises = day.exercises.filter((_, i) => i !== exIdx);
      updated[dayIdx] = day;
      return updated;
    });
  };

  const moveExercise = (dayIdx: number, exIdx: number, direction: -1 | 1) => {
    setDays((prev) => {
      const updated = [...prev];
      const day = { ...updated[dayIdx] };
      const exercises = [...day.exercises];
      const newIdx = exIdx + direction;
      if (newIdx < 0 || newIdx >= exercises.length) return prev;
      [exercises[exIdx], exercises[newIdx]] = [exercises[newIdx], exercises[exIdx]];
      day.exercises = exercises.map((ex, i) => ({ ...ex, sort_order: i }));
      updated[dayIdx] = day;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast({ title: "Program name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    try {
      let pid = programId;

      if (pid) {
        // Update existing program
        await supabase.from("programs").update({ name, description, updated_at: new Date().toISOString() } as any).eq("id", pid);
        // Delete existing days (cascade deletes exercises and sets)
        await supabase.from("program_days").delete().eq("program_id", pid);
      } else {
        // Create new program
        const { data: newProg } = await supabase
          .from("programs")
          .insert({ coach_id: user.id, name, description })
          .select("id")
          .single();
        if (!newProg) throw new Error("Failed to create program");
        pid = newProg.id;

        // Assign to client
        // Deactivate existing assignments
        await supabase
          .from("client_program_assignments")
          .update({ is_active: false } as any)
          .eq("client_id", clientId)
          .eq("is_active", true);

        await supabase.from("client_program_assignments").insert({
          client_id: clientId,
          program_id: pid,
          is_active: true,
        });
      }

      // Insert days, exercises, sets
      for (const day of days) {
        const { data: dayRow } = await supabase
          .from("program_days")
          .insert({
            program_id: pid,
            label: day.label,
            sort_order: day.sort_order,
            day_note: day.day_note,
          })
          .select("id")
          .single();

        if (!dayRow) continue;

        for (const ex of day.exercises) {
          const { data: exRow } = await supabase
            .from("program_exercises")
            .insert({
              program_day_id: dayRow.id,
              exercise_id: ex.exercise_id,
              sort_order: ex.sort_order,
              target_sets: ex.target_sets,
              target_reps: ex.target_reps,
              target_weight: ex.target_weight ? Number(ex.target_weight) : null,
              rest_seconds: ex.rest_seconds ? Number(ex.rest_seconds) : null,
              coach_notes: ex.coach_notes,
            })
            .select("id")
            .single();

          if (!exRow) continue;

          const setRows = ex.sets.map((s) => ({
            program_exercise_id: exRow.id,
            set_index: s.set_index,
            target_reps: s.target_reps || null,
            target_weight: s.target_weight ? Number(s.target_weight) : null,
            rest_seconds: s.rest_seconds ? Number(s.rest_seconds) : null,
            coach_note: s.coach_note,
          }));

          if (setRows.length > 0) {
            await supabase.from("program_exercise_sets").insert(setRows);
          }
        }
      }

      toast({ title: "Program saved!" });
      onSaved();
    } catch (err) {
      console.error("Save program error:", err);
      toast({ title: "Failed to save program", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Program meta */}
      <Input
        placeholder="Program Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="font-semibold bg-white text-black caret-black placeholder:text-gray-400"
        style={{ WebkitTextFillColor: "#000" }}
      />
      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[60px] bg-white text-black caret-black placeholder:text-gray-400"
        style={{ WebkitTextFillColor: "#000" }}
      />

      {/* Days */}
      {days.map((day, dayIdx) => (
        <div key={dayIdx} className="rounded-xl border border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={day.label}
              onChange={(e) => {
                const updated = [...days];
                updated[dayIdx] = { ...updated[dayIdx], label: e.target.value };
                setDays(updated);
              }}
              className="h-8 text-sm font-semibold flex-1 bg-white text-black caret-black placeholder:text-gray-400"
              style={{ WebkitTextFillColor: "#000" }}
            />
            <Input
              placeholder="Day note"
              value={day.day_note}
              onChange={(e) => {
                const updated = [...days];
                updated[dayIdx] = { ...updated[dayIdx], day_note: e.target.value };
                setDays(updated);
              }}
              className="h-8 text-xs flex-1 bg-white text-black caret-black placeholder:text-gray-400"
              style={{ WebkitTextFillColor: "#000" }}
            />
          </div>

          {/* Exercises in this day */}
          {day.exercises.map((ex, exIdx) => (
            <div key={exIdx} className="rounded-lg border border-border/50 bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium flex-1 truncate">{ex.exercise_name}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveExercise(dayIdx, exIdx, -1)}><ChevronUp className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveExercise(dayIdx, exIdx, 1)}><ChevronDown className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeExercise(dayIdx, exIdx)}><Trash2 className="h-3 w-3" /></Button>
              </div>

              {/* Exercise-level targets */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Sets</label>
                  <Input
                    type="number"
                    value={ex.target_sets}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "target_sets", Number(e.target.value) || 1)}
                    className="h-7 text-xs text-center bg-white text-black caret-black placeholder:text-gray-400"
                    style={{ WebkitTextFillColor: "#000" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Reps</label>
                  <Input
                    value={ex.target_reps}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "target_reps", e.target.value)}
                    className="h-7 text-xs text-center bg-white text-black caret-black placeholder:text-gray-400"
                    style={{ WebkitTextFillColor: "#000" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Weight</label>
                  <Input
                    value={ex.target_weight}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "target_weight", e.target.value)}
                    className="h-7 text-xs text-center bg-white text-black caret-black placeholder:text-gray-400"
                    placeholder="kg"
                    style={{ WebkitTextFillColor: "#000" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Rest (s)</label>
                  <Input
                    value={ex.rest_seconds}
                    onChange={(e) => updateExercise(dayIdx, exIdx, "rest_seconds", e.target.value)}
                    className="h-7 text-xs text-center bg-white text-black caret-black placeholder:text-gray-400"
                    style={{ WebkitTextFillColor: "#000" }}
                  />
                </div>
              </div>

              <Input
                placeholder="Coach notes for exercise"
                value={ex.coach_notes}
                onChange={(e) => updateExercise(dayIdx, exIdx, "coach_notes", e.target.value)}
                className="h-7 text-xs bg-white text-black caret-black placeholder:text-gray-400"
                style={{ WebkitTextFillColor: "#000" }}
              />

              {/* Per-set details */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Per-Set Details</p>
                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-[30px_1fr_1fr_1fr_2fr] gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-muted-foreground text-center">{s.set_index}</span>
                    <Input
                      placeholder="Reps"
                      value={s.target_reps}
                      onChange={(e) => updateSet(dayIdx, exIdx, setIdx, "target_reps", e.target.value)}
                      className="h-6 text-[10px] text-center bg-white text-black caret-black placeholder:text-gray-400"
                      style={{ WebkitTextFillColor: "#000" }}
                    />
                    <Input
                      placeholder="kg"
                      value={s.target_weight}
                      onChange={(e) => updateSet(dayIdx, exIdx, setIdx, "target_weight", e.target.value)}
                      className="h-6 text-[10px] text-center bg-white text-black caret-black placeholder:text-gray-400"
                      style={{ WebkitTextFillColor: "#000" }}
                    />
                    <Input
                      placeholder="Rest"
                      value={s.rest_seconds}
                      onChange={(e) => updateSet(dayIdx, exIdx, setIdx, "rest_seconds", e.target.value)}
                      className="h-6 text-[10px] text-center bg-white text-black caret-black placeholder:text-gray-400"
                      style={{ WebkitTextFillColor: "#000" }}
                    />
                    <Input
                      placeholder="Coach note for this set"
                      value={s.coach_note}
                      onChange={(e) => updateSet(dayIdx, exIdx, setIdx, "coach_note", e.target.value)}
                      className="h-6 text-[10px] bg-white text-black caret-black placeholder:text-gray-400"
                      style={{ WebkitTextFillColor: "#000" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            size="sm"
            className="w-full gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => openExercisePicker(dayIdx)}
          >
            <Plus className="h-3 w-3" /> Add Exercise
          </Button>
        </div>
      ))}

      <Button variant="outline" onClick={addDay} className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10">
        <Plus className="h-4 w-4" /> Add Day
      </Button>

      <Button onClick={handleSave} disabled={saving} className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60 disabled:text-primary-foreground/80">
        {saving ? "Saving..." : "Save Program"}
      </Button>

      {/* Exercise picker dialog */}
      <Dialog open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Select Exercise</DialogTitle></DialogHeader>
          <ExerciseLibrary selectable onSelect={addExerciseToDay} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
