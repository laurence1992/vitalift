import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { exercises } from "@/data/exercises";
import { workoutDays } from "@/data/exercises";
import { Input } from "@/components/ui/input";

export default function Exercises() {
  const [search, setSearch] = useState("");

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  // Find which days each exercise appears in
  const exerciseDays = (exId: string) => {
    return workoutDays
      .filter((d) => d.exercises.some((e) => e.id === exId))
      .map((d) => d.label)
      .join(", ");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold mb-4">All Exercises</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      <div className="space-y-2 px-5">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            {ex.image ? (
              <img
                src={ex.image}
                alt={ex.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                {ex.name.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{ex.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{exerciseDays(ex.id)}</p>
              {ex.videoUrl && (
                <a
                  href={ex.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Watch Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
