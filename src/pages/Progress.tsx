import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bell, Plus, Camera, Smartphone, Footprints, Moon, Weight, Percent, Utensils, HeartPulse, Activity, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useSignedUrl } from "@/hooks/useSignedUrl";

type HealthEntry = {
  id: string;
  date: string;
  steps: number | null;
  calories_burned: number | null;
  sleep_hours: number | null;
  resting_hr: number | null;
  caloric_intake: number | null;
  bodyweight: number | null;
  body_fat: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
};

type ProgressPhoto = {
  id: string;
  photo_url: string;
  angle: string;
};

const TILES = [
  { key: "steps", label: "Steps", icon: Footprints, unit: "", field: "steps" as const },
  { key: "sleep_hours", label: "Sleep", icon: Moon, unit: "h", field: "sleep_hours" as const },
  { key: "bodyweight", label: "Body Weight", icon: Weight, unit: "kg", field: "bodyweight" as const },
  { key: "body_fat", label: "Body Fat", icon: Percent, unit: "%", field: "body_fat" as const },
  { key: "caloric_intake", label: "Caloric Intake", icon: Utensils, unit: "cal", field: "caloric_intake" as const },
  { key: "resting_hr", label: "Resting HR", icon: HeartPulse, unit: "bpm", field: "resting_hr" as const },
  { key: "blood_pressure", label: "Blood Pressure", icon: Activity, unit: "mmHg", field: "blood_pressure_systolic" as const },
] as const;

function ProgressPhotoThumb({ photoUrl }: { photoUrl: string }) {
  const signedUrl = useSignedUrl("progress-photos", photoUrl);
  if (!signedUrl) return <div className="rounded-lg aspect-square bg-muted animate-pulse" />;
  return (
    <img src={signedUrl} alt="Progress" className="rounded-lg aspect-square object-cover w-full" />
  );
}

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [form, setForm] = useState({
    steps: "", sleep_hours: "", bodyweight: "", body_fat: "",
    caloric_intake: "", resting_hr: "", blood_pressure_systolic: "", blood_pressure_diastolic: "",
    calories_burned: "",
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("health_entries")
      .select("*")
      .eq("client_id", user.id)
      .order("date", { ascending: true });
    setEntries((data as HealthEntry[]) || []);

    // Load photos from progress_entries
    const { data: pe } = await supabase
      .from("progress_entries")
      .select("id")
      .eq("client_id", user.id);
    if (pe && pe.length > 0) {
      const ids = pe.map((e) => e.id);
      const { data: ph } = await supabase
        .from("progress_photos")
        .select("*")
        .in("progress_entry_id", ids)
        .order("created_at", { ascending: false });
      setPhotos((ph as ProgressPhoto[]) || []);
    }
  };

  useEffect(() => { load(); }, [user]);

  const last7 = useMemo(() => {
    const cutoff = subDays(new Date(), 7).toISOString().split("T")[0];
    return entries.filter((e) => e.date >= cutoff);
  }, [entries]);

  const getSparkData = (field: keyof HealthEntry) =>
    last7.filter((e) => e[field] != null).map((e) => ({ v: Number(e[field]) }));

  const getLatest = (field: keyof HealthEntry) => {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i][field] != null) return entries[i][field];
    }
    return null;
  };

  const handleAdd = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("health_entries").insert({
      client_id: user.id,
      steps: form.steps ? Number(form.steps) : null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      bodyweight: form.bodyweight ? Number(form.bodyweight) : null,
      body_fat: form.body_fat ? Number(form.body_fat) : null,
      caloric_intake: form.caloric_intake ? Number(form.caloric_intake) : null,
      resting_hr: form.resting_hr ? Number(form.resting_hr) : null,
      blood_pressure_systolic: form.blood_pressure_systolic ? Number(form.blood_pressure_systolic) : null,
      blood_pressure_diastolic: form.blood_pressure_diastolic ? Number(form.blood_pressure_diastolic) : null,
      calories_burned: form.calories_burned ? Number(form.calories_burned) : null,
    });
    setForm({ steps: "", sleep_hours: "", bodyweight: "", body_fat: "", caloric_intake: "", resting_hr: "", blood_pressure_systolic: "", blood_pressure_diastolic: "", calories_burned: "" });
    setAddOpen(false);
    setSaving(false);
    load();
  };

  const handlePhotoUpload = async () => {
    if (!user || photoFiles.length === 0) return;
    setUploadingPhotos(true);

    // Create or reuse a progress_entry for today
    const { data: existing } = await supabase
      .from("progress_entries")
      .select("id")
      .eq("client_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0])
      .maybeSingle();

    let entryId = existing?.id;
    if (!entryId) {
      const { data: newEntry } = await supabase
        .from("progress_entries")
        .insert({ client_id: user.id })
        .select("id")
        .single();
      entryId = newEntry?.id;
    }

    if (entryId) {
      for (const file of photoFiles) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from("progress-photos").upload(path, file);
        await supabase.from("progress_photos").insert({
          progress_entry_id: entryId,
          photo_url: path,
          angle: "other",
        });
      }
    }

    setPhotoFiles([]);
    setPhotoOpen(false);
    setUploadingPhotos(false);
    load();
  };

  const Sparkline = ({ data }: { data: { v: number }[] }) => {
    if (data.length < 2) return <div className="h-8" />;
    return (
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const F = ({ label, field, placeholder }: { label: string; field: keyof typeof form; placeholder?: string }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={form[field]}
        onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder || "0"}
        className="h-9 text-foreground caret-foreground [&]:[-webkit-text-fill-color:hsl(var(--foreground))]"
      />
    </div>
  );

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-6 pt-12">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Progress Dashboard</h1>
          <button className="p-1 relative">
            <Bell className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Apple Health banner */}
        <button
          disabled
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 opacity-60"
        >
          <Smartphone className="h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Connect Apple Health</p>
            <p className="text-[10px] text-muted-foreground">Coming Soon</p>
          </div>
        </button>
      </div>

      {/* Tiles grid */}
      <div className="px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((tile) => {
            const latest = tile.key === "blood_pressure"
              ? (getLatest("blood_pressure_systolic") != null
                ? `${getLatest("blood_pressure_systolic")}/${getLatest("blood_pressure_diastolic") ?? "—"}`
                : "—")
              : getLatest(tile.field);
            const sparkData = getSparkData(tile.field);
            const displayValue = tile.key === "blood_pressure"
              ? latest
              : latest != null ? `${latest}` : "—";

            return (
              <div
                key={tile.key}
                className="rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <tile.icon className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium text-muted-foreground">{tile.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground leading-tight">
                  {displayValue}
                  {displayValue !== "—" && tile.key !== "blood_pressure" && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">{tile.unit}</span>
                  )}
                  {displayValue !== "—" && tile.key === "blood_pressure" && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">{tile.unit}</span>
                  )}
                </p>
                <Sparkline data={sparkData} />
              </div>
            );
          })}

          {/* Photos tile */}
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground">Progress Photos</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPhotoOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {photos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No photos yet</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 8).map((p) => (
                  <ProgressPhotoThumb key={p.id} photoUrl={p.photo_url} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add data dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Health Data</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <F label="Steps" field="steps" />
            <F label="Sleep (hours)" field="sleep_hours" />
            <F label="Body Weight (kg)" field="bodyweight" />
            <F label="Body Fat (%)" field="body_fat" />
            <F label="Caloric Intake" field="caloric_intake" />
            <F label="Resting HR (bpm)" field="resting_hr" />
            <F label="BP Systolic" field="blood_pressure_systolic" placeholder="120" />
            <F label="BP Diastolic" field="blood_pressure_diastolic" placeholder="80" />
            <F label="Calories Burned" field="calories_burned" />
          </div>
          <Button onClick={handleAdd} disabled={saving} className="w-full mt-2">
            {saving ? "Saving..." : "Save Entry"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Photo upload dialog */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Progress Photos</DialogTitle></DialogHeader>
          <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Tap to select photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
            />
          </label>
          {photoFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{photoFiles.length} photo(s) selected</p>
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={() => setPhotoFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={handlePhotoUpload} disabled={uploadingPhotos || photoFiles.length === 0} className="w-full">
            {uploadingPhotos ? "Uploading..." : "Upload Photos"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
