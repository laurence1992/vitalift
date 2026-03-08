import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExerciseLibrary from "./ExerciseLibrary";

export default function CoachExerciseLibraryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground active:scale-[0.97]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-bold text-foreground">Exercise Library</h1>
      </div>
      <div className="px-5 pt-4">
        <ExerciseLibrary />
      </div>
    </div>
  );
}
