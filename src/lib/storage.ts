export type SetLog = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
};

export type ExerciseLog = {
  exerciseId: string;
  sets: SetLog[];
};

export type WorkoutLog = {
  id: string;
  date: string;
  dayId: string;
  exercises: ExerciseLog[];
  sessionNotes: string;
};

const WORKOUTS_KEY = "workout-tracker-workouts";

export function getWorkouts(): WorkoutLog[] {
  const raw = localStorage.getItem(WORKOUTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveWorkout(workout: WorkoutLog) {
  const workouts = getWorkouts();
  const idx = workouts.findIndex((w) => w.id === workout.id);
  if (idx >= 0) {
    workouts[idx] = workout;
  } else {
    workouts.push(workout);
  }
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
}

export function getLastSetsForExercise(
  exerciseId: string,
  excludeWorkoutId?: string
): SetLog[] | null {
  const workouts = getWorkouts()
    .filter((w) => w.id !== excludeWorkoutId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const w of workouts) {
    const exLog = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (exLog && exLog.sets.some((s) => s.weight !== null || s.reps !== null)) {
      return exLog.sets;
    }
  }
  return null;
}

export function getRecentWorkouts(limit = 5): WorkoutLog[] {
  return getWorkouts()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
