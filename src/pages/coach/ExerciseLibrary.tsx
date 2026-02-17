import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { exercises as staticExercises } from "@/data/exercises";

export type CoachExercise = {
  id: string;
  coach_id: string;
  name: string;
  image_url: string | null;
  video_url: string | null;
  notes: string | null;
  category: string;
  muscle_group: string;
  equipment: string;
  archived_at: string | null;
  created_at: string;
};

const CATEGORIES = ["Compound", "Isolation", "Bodyweight", "Cardio", "Other"];
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs", "Glutes", "Full Body"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Band", "Other"];

/** Returns true if exercise has both valid image and video URLs */
function hasValidMedia(ex: CoachExercise): boolean {
  return !!(ex.image_url && ex.image_url.trim() !== "" && ex.video_url && ex.video_url.trim() !== "");
}

export default function ExerciseLibrary({
  onSelect,
  selectable = false,
}: {
  onSelect?: (exercise: CoachExercise) => void;
  selectable?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exercises, setExercises] = useState<CoachExercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const [form, setForm] = useState({
    name: "", image_url: "", video_url: "", notes: "",
    category: "", muscle_group: "", equipment: "",
  });

  const load = async () => {
    if (!user) return;
    const q = supabase
      .from("coach_exercises")
      .select("*")
      .eq("coach_id", user.id)
      .order("name");

    if (showArchived) {
      q.not("archived_at", "is", null);
    } else {
      q.is("archived_at", null);
    }

    const { data } = await q;
    const result = (data as CoachExercise[]) || [];
    setExercises(result);

    // Auto-seed from static exercises if library is empty
    if (!seeded && result.length === 0 && !showArchived) {
      setSeeded(true);
      await seedStaticExercises();
    } else if (!seeded && result.length > 0 && !showArchived) {
      setSeeded(true);
      await backfillAndCleanup(result);
    }
  };

  const seedStaticExercises = async () => {
    if (!user) return;
    // Only seed exercises that have both image and video
    const validStatic = staticExercises.filter(
      (ex) => ex.image && ex.image.trim() !== "" && ex.videoUrl && ex.videoUrl.trim() !== ""
    );
    const rows = validStatic.map((ex) => ({
      coach_id: user.id,
      name: ex.name,
      image_url: ex.image || null,
      video_url: ex.videoUrl || null,
      notes: ex.notes || null,
      category: "",
      muscle_group: "",
      equipment: "",
    }));
    await supabase.from("coach_exercises").insert(rows);
    load();
  };

  const backfillAndCleanup = async (existing: CoachExercise[]) => {
    if (!user) return;
    let updated = false;

    // Backfill media from static exercises
    for (const staticEx of staticExercises) {
      // Skip static exercises without both media
      if (!staticEx.image || !staticEx.videoUrl || staticEx.videoUrl.trim() === "") continue;

      const match = existing.find((e) => e.name === staticEx.name);
      if (match && (!match.image_url || !match.video_url)) {
        await supabase.from("coach_exercises").update({
          image_url: match.image_url || staticEx.image || null,
          video_url: match.video_url || staticEx.videoUrl || null,
        } as any).eq("id", match.id);
        updated = true;
      }
    }

    // Auto-archive exercises that still lack both media
    const toArchive = existing.filter((ex) => !hasValidMedia(ex) && !ex.archived_at);
    for (const ex of toArchive) {
      await supabase.from("coach_exercises").update({
        archived_at: new Date().toISOString(),
      } as any).eq("id", ex.id);
      updated = true;
    }

    if (updated) load();
  };

  useEffect(() => { load(); }, [user, showArchived]);

  // For active (non-archived) view, only show exercises with valid media
  const filtered = exercises.filter((ex) => {
    // In active view, enforce media rule
    if (!showArchived && !hasValidMedia(ex)) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMuscle && ex.muscle_group !== filterMuscle) return false;
    if (filterEquipment && ex.equipment !== filterEquipment) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!user || !form.name.trim()) return;
    await supabase.from("coach_exercises").insert({
      coach_id: user.id,
      name: form.name.trim(),
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      notes: form.notes || null,
      category: form.category,
      muscle_group: form.muscle_group,
      equipment: form.equipment,
    });
    setForm({ name: "", image_url: "", video_url: "", notes: "", category: "", muscle_group: "", equipment: "" });
    setAddOpen(false);
    toast({ title: "Exercise added" });
    load();
  };

  const toggleArchive = async (ex: CoachExercise) => {
    if (ex.archived_at) {
      await supabase.from("coach_exercises").update({ archived_at: null } as any).eq("id", ex.id);
      toast({ title: "Exercise restored" });
    } else {
      await supabase.from("coach_exercises").update({ archived_at: new Date().toISOString() } as any).eq("id", ex.id);
      toast({ title: "Exercise archived" });
    }
    load();
  };

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {!selectable && (
          <div className="flex rounded-lg border border-primary/30 overflow-hidden">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !showArchived
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-primary border-r border-primary/30 hover:bg-primary/10"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                showArchived
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-primary hover:bg-primary/10"
              }`}
            >
              Archived
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={filterMuscle} onValueChange={(v) => setFilterMuscle(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Muscle Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscles</SelectItem>
            {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEquipment} onValueChange={(v) => setFilterEquipment(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {EQUIPMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Exercise list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No exercises found.</p>
        )}
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${
              selectable ? "cursor-pointer hover:bg-muted/50 active:scale-[0.98]" : ""
            }`}
            onClick={() => selectable && onSelect?.(ex)}
          >
            {/* Thumbnail */}
            {ex.image_url && (
              <div className="h-10 w-10 shrink-0 rounded-md bg-muted/30 overflow-hidden flex items-center justify-center">
                <img src={ex.image_url} alt={ex.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ex.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[ex.muscle_group, ex.equipment, ex.category].filter(Boolean).join(" · ") || "Uncategorized"}
              </p>
            </div>
            {!selectable && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleArchive(ex); }}
              >
                {ex.archived_at ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add button */}
      {!selectable && (
        <Button onClick={() => setAddOpen(true)} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Exercise
        </Button>
      )}

      {/* Add exercise dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Exercise name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} />
            <Input placeholder="Video URL" value={form.video_url} onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))} />
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.muscle_group} onValueChange={(v) => setForm((p) => ({ ...p, muscle_group: v }))}>
              <SelectTrigger><SelectValue placeholder="Muscle Group" /></SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.equipment} onValueChange={(v) => setForm((p) => ({ ...p, equipment: v }))}>
              <SelectTrigger><SelectValue placeholder="Equipment" /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <Button onClick={handleAdd} disabled={!form.name.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Add Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
