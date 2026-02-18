// Maps raw /src/assets/ paths stored in DB to proper Vite ES6 imports
import dbInclinePress from "@/assets/exercises/db-incline-press.jpg";
import latPulldown from "@/assets/exercises/lat-pulldown.png";
import seatedCableRow from "@/assets/exercises/seated-cable-row.png";
import dbShoulderPress from "@/assets/exercises/db-shoulder-press.png";
import lateralRaises from "@/assets/exercises/lateral-raises.png";
import tricepsPushdown from "@/assets/exercises/triceps-pushdown.png";
import bicepsCurls from "@/assets/exercises/biceps-curls.png";
import legPress from "@/assets/exercises/leg-press.jpg";
import hipThrust from "@/assets/exercises/hip-thrust.jpg";
import romanianDeadlift from "@/assets/exercises/romanian-deadlift.jpg";
import bulgarianSplitSquat from "@/assets/exercises/bulgarian-split-squat.png";
import backExtension from "@/assets/exercises/back-extension.jpg";
import coreExercise from "@/assets/exercises/core.png";

const imageMap: Record<string, string> = {
  "/src/assets/exercises/db-incline-press.jpg": dbInclinePress,
  "/src/assets/exercises/lat-pulldown.png": latPulldown,
  "/src/assets/exercises/seated-cable-row.png": seatedCableRow,
  "/src/assets/exercises/db-shoulder-press.png": dbShoulderPress,
  "/src/assets/exercises/lateral-raises.png": lateralRaises,
  "/src/assets/exercises/triceps-pushdown.png": tricepsPushdown,
  "/src/assets/exercises/biceps-curls.png": bicepsCurls,
  "/src/assets/exercises/leg-press.jpg": legPress,
  "/src/assets/exercises/hip-thrust.jpg": hipThrust,
  "/src/assets/exercises/romanian-deadlift.jpg": romanianDeadlift,
  "/src/assets/exercises/bulgarian-split-squat.png": bulgarianSplitSquat,
  "/src/assets/exercises/back-extension.jpg": backExtension,
  "/src/assets/exercises/core.png": coreExercise,
};

/**
 * Resolves an image URL that may be a raw /src/assets/ path
 * stored in the DB to the proper Vite-bundled import.
 */
export function resolveExerciseImage(url: string | null | undefined): string | null {
  if (!url) return null;
  return imageMap[url] || url;
}
