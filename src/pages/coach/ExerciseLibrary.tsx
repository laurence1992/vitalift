import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Archive, RotateCcw, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExerciseLibrarySkeleton } from "@/components/Skeletons";
import { exercises as staticExercises } from "@/data/exercises";
import { resolveExerciseImage } from "@/lib/exercise-image-map";

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
  work_seconds: number | null;
  rest_seconds: number | null;
  rounds: number | null;
};

const CATEGORIES = ["Strength", "Cardio", "Flexibility", "Core", "Mobility", "Compound", "Isolation", "Bodyweight", "Other"];
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs", "Glutes", "Full Body"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Band", "Other"];

function hasValidMedia(ex: CoachExercise): boolean {
  return !!(
    (ex.image_url && ex.image_url.trim() !== "") ||
    (ex.video_url && ex.video_url.trim() !== "")
  );
}

const emptyForm = {
  name: "", image_url: "", video_url: "", notes: "",
  category: "", muscle_group: "", equipment: "",
  work_seconds: "", rest_seconds: "", rounds: "",
};

export default function ExerciseLibrary({
  onSelect,
  selectable = false,
}: {
  onSelect?: (exercise: CoachExercise) => void;
  selectable?: boolean;
}) {
  const [detailExercise, setDetailExercise] = useState<CoachExercise | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [exercises, setExercises] = useState<CoachExercise[]>([]);
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    if (!user) return;
    setLoadingExercises(true);
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

    for (const staticEx of staticExercises) {
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

  const filtered = exercises.filter((ex) => {
    if (!showArchived && !hasValidMedia(ex)) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMuscle && ex.muscle_group !== filterMuscle) return false;
    if (filterEquipment && ex.equipment !== filterEquipment) return false;
    return true;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (ex: CoachExercise) => {
    setEditingId(ex.id);
    setForm({
      name: ex.name,
      image_url: ex.image_url || "",
      video_url: ex.video_url || "",
      notes: ex.notes || "",
      category: ex.category || "",
      muscle_group: ex.muscle_group || "",
      equipment: ex.equipment || "",
      work_seconds: ex.work_seconds?.toString() || "",
      rest_seconds: ex.rest_seconds?.toString() || "",
      rounds: ex.rounds?.toString() || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    const payload: any = {
      name: form.name.trim(),
      image_url: form.image_url || null,
      video_url: form.video_url || null,
      notes: form.notes || null,
      category: form.category,
      muscle_group: form.muscle_group,
      equipment: form.equipment,
      work_seconds: form.work_seconds ? Number(form.work_seconds) : null,
      rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null,
      rounds: form.rounds ? Number(form.rounds) : null,
    };

    if (editingId) {
      await supabase.from("coach_exercises").update(payload).eq("id", editingId);
      toast({ title: "Exercise updated" });
    } else {
      await supabase.from("coach_exercises").insert({ ...payload, coach_id: user.id });
      toast({ title: "Exercise added" });
    }

    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
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

  const isCardio = form.category === "Cardio";

  return (
    <div className="space-y-3">
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
          <div className="flex gap-1">
            <Button size="sm" variant={!showArchived ? "default" : "ghost"} onClick={() => setShowArchived(false)} className="text-xs">Active</Button>
            <Button size="sm" variant={showArchived ? "default" : "ghost"} onClick={() => setShowArchived(true)} className="text-xs">Archived</Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={filterMuscle} onValueChange={(v) => setFilterMuscle(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Muscle Group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscles</SelectItem>
            {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEquipment} onValueChange={(v) => setFilterEquipment(v === "all" ? "" : v)}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Equipment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {EQUIPMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No exercises found.</p>
        )}
        {filtered.map((ex) => {
          const meta = [ex.category, ex.muscle_group, ex.equipment].filter(Boolean).join(" · ");
          return (
            <div
              key={ex.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 cursor-pointer hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all"
              onClick={() => selectable ? onSelect?.(ex) : setDetailExercise(ex)}
            >
              {ex.image_url ? (
                <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
                  <img src={resolveExerciseImage(ex.image_url)} alt={ex.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                  {ex.name.slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{ex.name}</p>
                {meta ? (
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-2 py-0.5 mt-0.5">
                    {meta}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-border text-muted-foreground text-[10px] px-2 py-0.5 mt-0.5">
                    Uncategorized
                  </span>
                )}
                {ex.category === "Cardio" && ex.work_seconds && ex.rounds && (
                  <p className="text-[10px] text-primary font-medium mt-0.5">
                    {formatCardioInterval(ex)}
                  </p>
                )}
              </div>
              {!selectable && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); openEdit(ex); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); toggleArchive(ex); }}
                  >
                    {ex.archived_at ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!selectable && (
        <Button onClick={openAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add Exercise
        </Button>
      )}

      <Dialog open={!!detailExercise} onOpenChange={() => setDetailExercise(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detailExercise?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detailExercise?.image_url && (
              <div className="flex items-center justify-center rounded-xl bg-secondary p-2">
                <img
                  src={resolveExerciseImage(detailExercise.image_url)}
                  alt={detailExercise.name}
                  className="w-full max-h-[250px] rounded-xl object-contain"
                />
              </div>
            )}
            {detailExercise?.notes && (
              <p className="text-sm text-muted-foreground">{detailExercise.notes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {[detailExercise?.category, detailExercise?.muscle_group, detailExercise?.equipment].filter(Boolean).join(" · ")}
            </p>
            {detailExercise?.category === "Cardio" && detailExercise.work_seconds && detailExercise.rounds && (
              <p className="text-sm font-semibold text-primary">
                {formatCardioInterval(detailExercise)}
              </p>
            )}
            {detailExercise?.video_url && (() => {
              const url = detailExercise.video_url!.trim().startsWith("http")
                ? detailExercise.video_url!.trim()
                : `https://${detailExercise.video_url!.trim()}`;
              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground no-underline active:scale-[0.97]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch Demo
                </a>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Exercise" : "Add Exercise"}</DialogTitle></DialogHeader>
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

            {isCardio && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">Interval Timing</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Work (sec)</label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={form.work_seconds}
                      onChange={(e) => setForm((p) => ({ ...p, work_seconds: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Rest (sec)</label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={form.rest_seconds}
                      onChange={(e) => setForm((p) => ({ ...p, rest_seconds: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Rounds</label>
                    <Input
                      type="number"
                      placeholder="3"
                      value={form.rounds}
                      onChange={(e) => setForm((p) => ({ ...p, rounds: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <Button onClick={handleSave} disabled={!form.name.trim()} className="w-full">
              {editingId ? "Save Changes" : "Add Exercise"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function formatCardioInterval(ex: { work_seconds?: number | null; rest_seconds?: number | null; rounds?: number | null }): string {
  const work = ex.work_seconds || 0;
  const rest = ex.rest_seconds || 0;
  const rounds = ex.rounds || 1;
  const fmtTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}s` : ""}` : `${s}s`;
  return `${fmtTime(work)} on / ${fmtTime(rest)} off × ${rounds} rounds`;
}
