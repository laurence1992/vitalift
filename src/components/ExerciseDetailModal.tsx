import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { DayExercise } from "@/data/exercises";

export default function ExerciseDetailModal({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: DayExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!exercise) return null;

  const cleanUrl =
    exercise.videoUrl && exercise.videoUrl.trim() !== ""
      ? exercise.videoUrl.trim().startsWith("http")
        ? exercise.videoUrl.trim()
        : `https://${exercise.videoUrl.trim()}`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {exercise.image && (
            <img
              src={exercise.image}
              alt={exercise.name}
              className="w-full max-h-[250px] rounded-lg object-contain bg-muted/30"
            />
          )}
          {exercise.notes && (
            <p className="text-sm text-muted-foreground">{exercise.notes}</p>
          )}
          <p className="text-sm">
            Target: {exercise.targetSets} × {exercise.targetReps}
          </p>
          {cleanUrl && (
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground no-underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Watch Demo
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
