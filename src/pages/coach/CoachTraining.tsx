import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Dumbbell, Edit, Plus, Copy, Trash2, LayoutTemplate } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import ProgramBuilder from "./ProgramBuilder";

type ProgramInfo = { id: string; name: string; description: string | null; updated_at: string };

type Mode =
  | { view: "list" }
  | { view: "personal-builder"; programId?: string }
  | { view: "template-builder"; programId?: string }
  | { view: "template-edit"; programId: string };

export default function CoachTraining() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personalProg, setPersonalProg] = useState<ProgramInfo | null>(null);
  const [templates, setTemplates] = useState<ProgramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ view: "list" });
  const [deleteTarget, setDeleteTarget] = useState<ProgramInfo | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("programs")
      .select("id, name, description, updated_at")
      .eq("coach_id", user.id)
      .or("is_coach_personal.eq.true,is_template.eq.true") as any;

    const rows: any[] = data || [];
    setPersonalProg(rows.find((r: any) => r.is_coach_personal) ?? null);
    setTemplates(rows.filter((r: any) => r.is_template));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return;
    await supabase.from("program_days").delete().eq("program_id", deleteTarget.id);
    await supabase.from("programs").delete().eq("id", deleteTarget.id);
    toast({ title: "Template deleted" });
    setDeleteTarget(null);
    load();
  };

  const handleDuplicateTemplate = async (tmpl: ProgramInfo) => {
    if (!user) return;
    // Copy the program header
    const { data: newProg } = await supabase
      .from("programs")
      .insert({ coach_id: user.id, name: `${tmpl.name} (copy)`, description: tmpl.description, is_template: true } as any)
      .select("id")
      .single();
    if (!newProg) return;

    // Copy days + exercises + sets
    const { data: days } = await supabase.from("program_days").select("*").eq("program_id", tmpl.id).order("sort_order");
    for (const day of (days || []) as any[]) {
      const { data: dayRow } = await supabase
        .from("program_days")
        .insert({ program_id: (newProg as any).id, label: day.label, sort_order: day.sort_order, day_note: day.day_note })
        .select("id").single();
      if (!dayRow) continue;

      const { data: exes } = await supabase.from("program_exercises").select("*").eq("program_day_id", day.id).order("sort_order");
      for (const ex of (exes || []) as any[]) {
        const { data: exRow } = await supabase
          .from("program_exercises")
          .insert({ program_day_id: (dayRow as any).id, exercise_id: ex.exercise_id, sort_order: ex.sort_order, target_sets: ex.target_sets, target_reps: ex.target_reps, target_weight: ex.target_weight, rest_seconds: ex.rest_seconds, coach_notes: ex.coach_notes })
          .select("id").single();
        if (!exRow) continue;

        const { data: sets } = await supabase.from("program_exercise_sets").select("*").eq("program_exercise_id", ex.id).order("set_index");
        if ((sets || []).length > 0) {
          await supabase.from("program_exercise_sets").insert(
            (sets as any[]).map((s) => ({ program_exercise_id: (exRow as any).id, set_index: s.set_index, target_reps: s.target_reps, target_weight: s.target_weight, rest_seconds: s.rest_seconds, coach_note: s.coach_note }))
          );
        }
      }
    }
    toast({ title: "Template duplicated" });
    load();
  };

  // ---- Builder views ----
  if (mode.view === "personal-builder") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
          <button onClick={() => setMode({ view: "list" })} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-foreground">
            {mode.programId ? "Edit My Programme" : "Create My Programme"}
          </h1>
        </div>
        <div className="px-5 pt-4">
          <ProgramBuilder
            mode="personal"
            programId={mode.programId}
            onSaved={() => { setMode({ view: "list" }); load(); }}
          />
        </div>
      </div>
    );
  }

  if (mode.view === "template-builder" || mode.view === "template-edit") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
          <button onClick={() => setMode({ view: "list" })} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-foreground">
            {mode.view === "template-edit" ? "Edit Template" : "New Template"}
          </h1>
        </div>
        <div className="px-5 pt-4">
          <ProgramBuilder
            mode="template"
            programId={mode.view === "template-edit" ? mode.programId : undefined}
            onSaved={() => { setMode({ view: "list" }); load(); }}
          />
        </div>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-background px-5 pb-6 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Dumbbell className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">My Training</h1>
        </div>
        <p className="text-muted-foreground text-xs">Your personal programme and reusable templates</p>
      </div>

      <div className="px-5 space-y-6">
        {/* Personal Programme */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">My Programme</p>
          {loading ? (
            <div className="h-20 rounded-2xl bg-card animate-pulse" />
          ) : personalProg ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{personalProg.name}</p>
                  {personalProg.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{personalProg.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {format(new Date(personalProg.updated_at), "MMM d, yyyy")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs shrink-0 ml-2"
                  onClick={() => setMode({ view: "personal-builder", programId: personalProg.id })}
                >
                  <Edit className="h-3 w-3" /> Edit
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setMode({ view: "personal-builder" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" /> Create my programme
            </button>
          )}
        </section>

        {/* Templates */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Templates</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 text-xs"
              onClick={() => setMode({ view: "template-builder" })}
            >
              <Plus className="h-3 w-3" /> New
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-card animate-pulse" />)}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <LayoutTemplate className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No templates yet. Save a programme as a template to reuse it across clients.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tmpl.name}</p>
                      {tmpl.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{tmpl.description}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setMode({ view: "template-edit", programId: tmpl.id })}
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleDuplicateTemplate(tmpl)}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(tmpl)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently deleted. This won't affect programmes already assigned to clients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
