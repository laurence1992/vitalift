import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UtensilsCrossed, Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSignedUrl } from "@/hooks/useSignedUrl";

type Recipe = {
  id: string;
  title: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  ingredients: string | null;
  instructions: string | null;
  image_url: string | null;
  coach_id: string;
};

const emptyForm = { title: "", calories: "", protein: "", carbs: "", fats: "", ingredients: "", instructions: "", image_url: "" };

function RecipeCard({ recipe: r, isCoach, onEdit, onDelete }: { recipe: Recipe; isCoach: boolean; onEdit: (r: Recipe) => void; onDelete: (id: string) => void }) {
  const signedUrl = useSignedUrl("recipe-images", r.image_url);

  return (
    <div className="rounded-xl bg-primary text-white overflow-hidden">
      {signedUrl && (
        <img src={signedUrl} alt={r.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-white">{r.title}</h3>
          {isCoach && (
            <div className="flex gap-1">
              <button onClick={() => onEdit(r)} className="p-1 text-white/70 hover:text-white">
                <Edit2 className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(r.id)} className="p-1 text-white/70 hover:text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-3 text-xs text-white/70">
          {r.calories != null && <span>{r.calories} cal</span>}
          {r.protein != null && <span>{r.protein}g P</span>}
          {r.carbs != null && <span>{r.carbs}g C</span>}
          {r.fats != null && <span>{r.fats}g F</span>}
        </div>
        {r.ingredients && (
          <div>
            <p className="text-xs font-semibold text-white/80 mb-1">Ingredients</p>
            <p className="text-sm whitespace-pre-line text-white">{r.ingredients}</p>
          </div>
        )}
        {r.instructions && (
          <div>
            <p className="text-xs font-semibold text-white/80 mb-1">Instructions</p>
            <p className="text-sm whitespace-pre-line text-white">{r.instructions}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Recipes() {
  const { user, profile } = useAuth();
  const isCoach = profile?.role === "coach";
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
    setRecipes((data as Recipe[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setImageFile(null);
    setEditOpen(true);
  };

  const openEdit = (r: Recipe) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      calories: r.calories?.toString() || "",
      protein: r.protein?.toString() || "",
      carbs: r.carbs?.toString() || "",
      fats: r.fats?.toString() || "",
      ingredients: r.ingredients || "",
      instructions: r.instructions || "",
      image_url: r.image_url || "",
    });
    setImageFile(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    let imageUrl = form.image_url;
    if (imageFile) {
      const path = `${user.id}/${Date.now()}-${imageFile.name}`;
      await supabase.storage.from("recipe-images").upload(path, imageFile);
      imageUrl = path;
    }

    const payload = {
      title: form.title,
      calories: form.calories ? Number(form.calories) : null,
      protein: form.protein ? Number(form.protein) : null,
      carbs: form.carbs ? Number(form.carbs) : null,
      fats: form.fats ? Number(form.fats) : null,
      ingredients: form.ingredients,
      instructions: form.instructions,
      image_url: imageUrl || null,
      coach_id: user.id,
    };

    if (editId) {
      await supabase.from("recipes").update(payload).eq("id", editId);
    } else {
      await supabase.from("recipes").insert(payload);
    }

    setSaving(false);
    setEditOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("recipes").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary/20 to-accent/5 px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-1">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Recipes</h1>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {isCoach && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" onClick={openNew}><Plus className="h-4 w-4" /> New Recipe</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} Recipe</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium">Calories</label><Input type="number" value={form.calories} onChange={(e) => setForm((p) => ({ ...p, calories: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium">Protein (g)</label><Input type="number" value={form.protein} onChange={(e) => setForm((p) => ({ ...p, protein: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium">Carbs (g)</label><Input type="number" value={form.carbs} onChange={(e) => setForm((p) => ({ ...p, carbs: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium">Fats (g)</label><Input type="number" value={form.fats} onChange={(e) => setForm((p) => ({ ...p, fats: e.target.value }))} /></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ingredients</label>
                  <Textarea value={form.ingredients} onChange={(e) => setForm((p) => ({ ...p, ingredients: e.target.value }))} placeholder="One per line..." className="min-h-[100px]" />
                </div>
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <Textarea value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} placeholder="Step by step..." className="min-h-[100px]" />
                </div>
                <div>
                  <label className="text-sm font-medium">Image (optional)</label>
                  <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </div>
                <Button onClick={handleSave} disabled={saving || !form.title} className="w-full">
                  {saving ? "Saving..." : "Save Recipe"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div className="space-y-3">
          {recipes.map((r) => (
           <RecipeCard key={r.id} recipe={r} isCoach={isCoach} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}
