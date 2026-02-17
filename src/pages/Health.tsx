import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Plus, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type HealthEntry = {
  id: string;
  date: string;
  steps: number | null;
  calories_burned: number | null;
  sleep_hours: number | null;
  resting_hr: number | null;
  caloric_intake: number | null;
  bodyweight: number | null;
};

export default function Health() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    steps: "", calories_burned: "", sleep_hours: "", resting_hr: "", caloric_intake: "", bodyweight: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_entries")
      .select("*")
      .eq("client_id", user.id)
      .order("date", { ascending: false });
    setEntries((data as HealthEntry[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("health_entries").insert({
      client_id: user.id,
      steps: form.steps ? Number(form.steps) : null,
      calories_burned: form.calories_burned ? Number(form.calories_burned) : null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      resting_hr: form.resting_hr ? Number(form.resting_hr) : null,
      caloric_intake: form.caloric_intake ? Number(form.caloric_intake) : null,
      bodyweight: form.bodyweight ? Number(form.bodyweight) : null,
    });
    setForm({ steps: "", calories_burned: "", sleep_hours: "", resting_hr: "", caloric_intake: "", bodyweight: "" });
    setAddOpen(false);
    setSaving(false);
    load();
  };

  const F = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input type="number" value={form[field]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} placeholder="0" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <Heart className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Health</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2"><Plus className="h-4 w-4" /> Log Health Data</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Health Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <F label="Steps" field="steps" />
              <F label="Calories Burned" field="calories_burned" />
              <F label="Sleep (hours)" field="sleep_hours" />
              <F label="Resting HR (bpm)" field="resting_hr" />
              <F label="Caloric Intake" field="caloric_intake" />
              <F label="Bodyweight (kg)" field="bodyweight" />
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="w-full gap-2 opacity-50 cursor-not-allowed" disabled>
          <Smartphone className="h-4 w-4" />
          Connect Apple Health (Coming Soon)
        </Button>

        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-medium mb-1">{format(new Date(e.date), "MMM d, yyyy")}</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                {e.steps != null && <span>🚶 {e.steps} steps</span>}
                {e.calories_burned != null && <span>🔥 {e.calories_burned} cal</span>}
                {e.sleep_hours != null && <span>😴 {e.sleep_hours}h sleep</span>}
                {e.resting_hr != null && <span>❤️ {e.resting_hr} bpm</span>}
                {e.caloric_intake != null && <span>🍽️ {e.caloric_intake} cal in</span>}
                {e.bodyweight != null && <span>⚖️ {e.bodyweight} kg</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
