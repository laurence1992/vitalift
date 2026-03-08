import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { exercises } from "@/data/exercises";
import { workoutDays } from "@/data/exercises";
import { Input } from "@/components/ui/input";

export default function Exercises() {
  const [search, setSearch] = useState("");

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const exerciseDays = (exId: string) => {
    return workoutDays
      .filter((d) => d.exercises.some((e) => e.id === exId))
      .map((d) => d.label)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground mb-4">All Exercises</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2 px-5">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-secondary transition-colors"
          >
            {ex.image ? (
              <img
                src={ex.image}
                alt={ex.name}
                className="h-11 w-11 rounded-xl object-cover bg-secondary"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-sm text-muted-foreground">
                {ex.name.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{ex.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{exerciseDays(ex.id)}</p>
              {ex.videoUrl && ex.videoUrl.trim() !== "" && (() => {
                const cleanUrl = ex.videoUrl.trim().startsWith("http") ? ex.videoUrl.trim() : `https://${ex.videoUrl.trim()}`;
                return (
                  <a
                    href={cleanUrl}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold no-underline active:scale-[0.97]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch Demo
                  </a>
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
