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

export type Exercise = {
  id: string;
  name: string;
  image: string;
  videoUrl: string;
  notes?: string;
};

export type DayExercise = Exercise & {
  targetSets: number | string;
  targetReps: string;
};

export const exercises: Exercise[] = [
  { id: "db-incline-press", name: "DB incline press", image: dbInclinePress, videoUrl: "https://www.youtube.com/watch?v=jMQA3XtJSgo" },
  { id: "lat-pulldown", name: "Lat pulldown", image: latPulldown, videoUrl: "https://www.youtube.com/watch?v=JGeRYIZdojU" },
  { id: "seated-row", name: "Seated row", image: "", videoUrl: "https://www.youtube.com/watch?v=lJoozxC0Rns" },
  { id: "db-shoulder-press", name: "DB shoulder press", image: "", videoUrl: "https://www.youtube.com/watch?v=HzIiNhHhhtA" },
  { id: "lateral-raises", name: "Lateral raises", image: "", videoUrl: "https://www.youtube.com/watch?v=OuG1smZTsQQ" },
  { id: "triceps-pushdown", name: "Triceps pushdown", image: "", videoUrl: "https://www.youtube.com/watch?v=LXkCrxn3caQ" },
  { id: "biceps-curls", name: "Biceps curls", image: "", videoUrl: "https://www.youtube.com/watch?v=MtXdEcW3Eog" },
  { id: "leg-press", name: "Leg press", image: "", videoUrl: "https://www.youtube.com/watch?v=qCR9bN3G1t4" },
  { id: "hip-thrust", name: "Hip thrust", image: "", videoUrl: "https://www.youtube.com/watch?v=pF17m_CXfL0" },
  { id: "romanian-deadlift", name: "Romanian deadlift (DB)", image: "", videoUrl: "https://www.youtube.com/watch?v=5WxMW-Fu5KU" },
  { id: "bulgarian-split-squat", name: "Bulgarian split squat", image: "", videoUrl: "https://www.youtube.com/watch?v=vgn7bSXkgkA" },
  { id: "back-extension", name: "Back extension (glutes)", image: "", videoUrl: "https://www.youtube.com/watch?v=ENXyYltB7CM" },
];

export type WorkoutDay = {
  id: string;
  label: string;
  subtitle: string;
  dayNote?: string;
  exercises: DayExercise[];
};

const e = (id: string) => exercises.find((ex) => ex.id === id)!;

export const workoutDays: WorkoutDay[] = [
  {
    id: "day-1",
    label: "Day 1",
    subtitle: "Upper",
    dayNote: "Rest 60–90 sec. Keep it moving.",
    exercises: [
      { ...e("db-incline-press"), targetSets: 4, targetReps: "8–10" },
      { ...e("lat-pulldown"), targetSets: 3, targetReps: "10" },
      { ...e("seated-row"), targetSets: 3, targetReps: "10" },
      { ...e("db-shoulder-press"), targetSets: 3, targetReps: "8–10" },
      { ...e("lateral-raises"), targetSets: 3, targetReps: "12–15" },
      { ...e("triceps-pushdown"), targetSets: "2–3", targetReps: "12" },
      { ...e("biceps-curls"), targetSets: "2–3", targetReps: "12" },
      { id: "core", name: "Core", image: "", videoUrl: "", targetSets: 3, targetReps: "—" },
    ],
  },
  {
    id: "day-2",
    label: "Day 2",
    subtitle: "Lower",
    exercises: [
      { ...e("leg-press"), targetSets: 4, targetReps: "10" },
      { ...e("hip-thrust"), targetSets: 4, targetReps: "10" },
      { ...e("romanian-deadlift"), targetSets: 3, targetReps: "8–10" },
      { ...e("bulgarian-split-squat"), targetSets: 3, targetReps: "8/leg" },
      { ...e("back-extension"), targetSets: 3, targetReps: "12" },
      { id: "core", name: "Core", image: "", videoUrl: "", targetSets: 3, targetReps: "—" },
    ],
  },
  {
    id: "day-3",
    label: "Day 3",
    subtitle: "Upper",
    dayNote: "Slightly lighter, quicker.",
    exercises: [
      { ...e("db-incline-press"), targetSets: 3, targetReps: "10" },
      { ...e("lat-pulldown"), targetSets: 3, targetReps: "10" },
      { ...e("seated-row"), targetSets: 3, targetReps: "10" },
      { ...e("db-shoulder-press"), targetSets: 3, targetReps: "10" },
      { ...e("lateral-raises"), targetSets: 3, targetReps: "15" },
      { id: "arms-superset", name: "Arms superset (biceps + triceps)", image: "", videoUrl: "", targetSets: 2, targetReps: "each" },
      { id: "core", name: "Core", image: "", videoUrl: "", targetSets: 3, targetReps: "—" },
    ],
  },
  {
    id: "day-4",
    label: "Day 4",
    subtitle: "Lower (Glute Focus)",
    exercises: [
      { ...e("hip-thrust"), targetSets: 4, targetReps: "8–12" },
      { ...e("romanian-deadlift"), targetSets: 3, targetReps: "8" },
      { ...e("leg-press"), targetSets: 3, targetReps: "12", notes: "Feet higher on platform" },
      { ...e("bulgarian-split-squat"), targetSets: 3, targetReps: "8/leg" },
      { ...e("back-extension"), targetSets: 3, targetReps: "12" },
      { id: "core", name: "Core", image: "", videoUrl: "", targetSets: 3, targetReps: "—" },
    ],
  },
];
