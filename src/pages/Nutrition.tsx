import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Utensils, Plus, Trash2, Settings2, X, Check } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type MealLog = {
  id: string;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  notes: string | null;
  created_at: string;
};

type Targets = {
  calorie_target: number;
  protein_target: number;
};

const today = format(new Date(), "yyyy-MM-dd");

export default function Nutrition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [targets, setTargets] = useState<Targets>({ calorie_target: 2000, protein_target: 150 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Add form
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Targets edit
  const [editCalTarget, setEditCalTarget] = useState("");
  const [editProtTarget, setEditProtTarget] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [mealsRes, profileRes] = await Promise.all([
      (supabase as any)
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("calorie_target, protein_target").eq("id", user.id).maybeSingle() as any,
    ]);
    setMeals((mealsRes.data as MealLog[]) || []);
    if (profileRes.data) {
      setTargets({
        calorie_target: profileRes.data.calorie_target ?? 2000,
        protein_target: profileRes.data.protein_target ?? 150,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (showAdd) setTimeout(() => nameRef.current?.focus(), 100);
  }, [showAdd]);

  const totalCalories = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalProtein = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0);

  const handleAdd = async () => {
    if (!mealName.trim() || !user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("nutrition_logs").insert({
      user_id: user.id,
      date: today,
      meal_name: mealName.trim(),
      calories: calories ? Number(calories) : null,
      protein_g: protein ? Number(protein) : null,
      notes: notes.trim() || null,
    });
    if (error) {
      toast({ title: "Failed to save meal", variant: "destructive" });
    } else {
      setMealName(""); setCalories(""); setProtein(""); setNotes("");
      setShowAdd(false);
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("nutrition_logs").delete().eq("id", id);
    setDeleteId(null);
    load();
  };

  const handleSaveTargets = async () => {
    if (!user) return;
    const cal = Number(editCalTarget) || targets.calorie_target;
    const prot = Number(editProtTarget) || targets.protein_target;
    await (supabase as any).from("profiles").update({ calorie_target: cal, protein_target: prot }).eq("id", user.id);
    setTargets({ calorie_target: cal, protein_target: prot });
    setShowTargets(false);
    toast({ title: "Targets updated" });
  };

  const pct = (val: number, target: number) => Math.min(100, Math.round((val / target) * 100));

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-background px-5 pb-4 pt-12">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Utensils className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Nutrition</h1>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => {
              setEditCalTarget(String(targets.calorie_target));
              setEditProtTarget(String(targets.protein_target));
              setShowTargets(true);
            }}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{format(new Date(), "EEEE, d MMMM")}</p>
      </div>

      {/* Daily totals */}
      <div className="px-5 mb-5">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          {/* Calories */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">Calories</span>
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">{totalCalories.toLocaleString()}</span> / {targets.calorie_target.toLocaleString()} kcal
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct(totalCalories, targets.calorie_target)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {Math.max(0, targets.calorie_target - totalCalories).toLocaleString()} remaining
            </p>
          </div>
          {/* Protein */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs font-semibold text-foreground">Protein</span>
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-semibold">{totalProtein.toFixed(1)}</span> / {targets.protein_target} g
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct(totalProtein, targets.protein_target)}%`, background: "hsl(270 100% 70%)" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {Math.max(0, targets.protein_target - totalProtein).toFixed(1)} g remaining
            </p>
          </div>
        </div>
      </div>

      {/* Meals list */}
      <div className="px-5 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today's Meals {meals.length > 0 && `· ${meals.length}`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-card animate-pulse" />)}
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Utensils className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-semibold text-foreground">No meals logged yet</p>
            <p className="text-xs">Tap + to add a meal</p>
          </div>
        ) : (
          meals.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-border bg-card px-4 py-3"
            >
              {deleteId === m.id ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Delete "{m.meal_name}"?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => handleDelete(m.id)}>
                      <Check className="h-3 w-3 mr-1" />Delete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setDeleteId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.meal_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {m.calories != null && (
                        <span className="text-xs text-muted-foreground">{m.calories} kcal</span>
                      )}
                      {m.protein_g != null && (
                        <span className="text-xs text-muted-foreground">{m.protein_g}g protein</span>
                      )}
                      {m.notes && (
                        <span className="text-xs text-muted-foreground truncate">{m.notes}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-5 h-12 w-12 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground active:scale-95 transition-transform z-40"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Add meal sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAdd(false)} />
          <div className="relative bg-card rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-foreground">Log Meal</h2>
              <button onClick={() => setShowAdd(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <Input
              ref={nameRef}
              placeholder="Meal name *"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Calories (kcal)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 450"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Protein (g)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 35"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
            </div>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              className="w-full h-12 font-semibold"
              onClick={handleAdd}
              disabled={saving || !mealName.trim()}
            >
              {saving ? "Saving..." : "Add Meal"}
            </Button>
          </div>
        </div>
      )}

      {/* Edit targets sheet */}
      {showTargets && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTargets(false)} />
          <div className="relative bg-card rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-foreground">Daily Targets</h2>
              <button onClick={() => setShowTargets(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Calorie target (kcal)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={editCalTarget}
                onChange={(e) => setEditCalTarget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Protein target (g)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={editProtTarget}
                onChange={(e) => setEditProtTarget(e.target.value)}
              />
            </div>
            <Button className="w-full h-12 font-semibold" onClick={handleSaveTargets}>
              Save Targets
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
