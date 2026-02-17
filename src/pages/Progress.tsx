import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Plus, Camera } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProgressEntry = {
  id: string;
  date: string;
  bodyweight: number | null;
  notes: string | null;
};

type ProgressPhoto = {
  id: string;
  photo_url: string;
  angle: string;
};

export default function Progress() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoAngle, setPhotoAngle] = useState("front");
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress_entries")
      .select("*")
      .eq("client_id", user.id)
      .order("date", { ascending: true });
    setEntries((data as ProgressEntry[]) || []);
  };

  useEffect(() => { loadEntries(); }, [user]);

  const handleAdd = async () => {
    if (!user) return;
    setSaving(true);
    const { data: entry, error } = await supabase
      .from("progress_entries")
      .insert({
        client_id: user.id,
        coach_id: profile?.coach_id || null,
        bodyweight: weight ? Number(weight) : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (!error && entry && photoFile) {
      const path = `${user.id}/${Date.now()}-${photoFile.name}`;
      await supabase.storage.from("progress-photos").upload(path, photoFile);
      const { data: { publicUrl } } = supabase.storage.from("progress-photos").getPublicUrl(path);
      await supabase.from("progress_photos").insert({
        progress_entry_id: entry.id,
        photo_url: publicUrl,
        angle: photoAngle,
      });
    }

    setWeight(""); setNotes(""); setPhotoFile(null); setAddOpen(false); setSaving(false);
    loadEntries();
  };

  const weightData = entries.filter((e) => e.bodyweight).map((e) => ({
    date: format(new Date(e.date), "MMM d"),
    weight: e.bodyweight,
  }));

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Progress Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Bodyweight (kg)</label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How do you feel?" />
              </div>
              <div>
                <label className="text-sm font-medium">Photo (optional)</label>
                <div className="flex gap-2 mt-1">
                  <label className="flex-1 flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer text-sm text-muted-foreground hover:bg-card">
                    <Camera className="h-4 w-4" />
                    {photoFile ? photoFile.name : "Choose photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                  </label>
                  <Select value={photoAngle} onValueChange={setPhotoAngle}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">Front</SelectItem>
                      <SelectItem value="side">Side</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {weightData.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Weight Trend</h2>
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

        <div className="space-y-2">
          {[...entries].reverse().map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-medium">{format(new Date(e.date), "MMM d, yyyy")}</p>
              {e.bodyweight && <p className="text-xs text-muted-foreground">{e.bodyweight} kg</p>}
              {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
