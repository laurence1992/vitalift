import { useState } from "react";
import { Sparkles, RefreshCw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FormAnswers {
  goal: string;
  daysPerWeek: string;
  equipment: string;
  fitnessLevel: string;
  sessionLength: string;
  injuries: string;
  cardioPreference: string;
}

interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  notes?: string;
}

interface DayPlan {
  day: string;
  type: "Strength" | "Cardio" | "Rest" | "Hybrid";
  focus: string;
  exercises?: Exercise[];
  duration?: string;
  description?: string;
}

interface Programme {
  days: DayPlan[];
  notes?: string;
}

const defaultAnswers: FormAnswers = {
  goal: "",
  daysPerWeek: "",
  equipment: "",
  fitnessLevel: "",
  sessionLength: "",
  injuries: "",
  cardioPreference: "",
};

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

const typeColors: Record<string, string> = {
  Strength: "bg-primary/20 text-primary",
  Cardio: "bg-emerald-500/20 text-emerald-400",
  Rest: "bg-muted text-muted-foreground",
  Hybrid: "bg-amber-500/20 text-amber-400",
};

export default function AIProgramme() {
  const [answers, setAnswers] = useState<FormAnswers>(defaultAnswers);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const { toast } = useToast();

  const set = (key: keyof FormAnswers) => (value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const isFormValid =
    answers.goal &&
    answers.daysPerWeek &&
    answers.equipment &&
    answers.fitnessLevel &&
    answers.sessionLength &&
    answers.cardioPreference;

  async function generateProgramme() {
    if (!isFormValid) {
      toast({ title: "Please answer all required questions", variant: "destructive" });
      return;
    }

    setLoading(true);
    setErrorDetail(null);
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    console.log("[AIProgramme] API key present:", !!apiKey);
    console.log("[AIProgramme] API key prefix:", apiKey ? apiKey.slice(0, 6) + "…" : "MISSING");

    const prompt = `You are an expert personal trainer and strength & conditioning coach. Create a complete weekly training programme based on the following:

- Primary Goal: ${answers.goal}
- Training Days Per Week: ${answers.daysPerWeek}
- Available Equipment: ${answers.equipment}
- Fitness Level: ${answers.fitnessLevel}
- Session Duration: ${answers.sessionLength}
- Cardio Preference: ${answers.cardioPreference}
${answers.injuries ? `- Injuries/Limitations: ${answers.injuries}` : ""}

Return a JSON object with this exact structure:
{
  "days": [
    {
      "day": "Monday",
      "type": "Strength",
      "focus": "Upper Body Push",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "notes": "Rest 90s between sets" }
      ]
    },
    {
      "day": "Tuesday",
      "type": "Cardio",
      "focus": "Zone 2 Endurance",
      "duration": "30 mins",
      "description": "Steady-state run at conversational pace, 65-75% max HR"
    },
    {
      "day": "Wednesday",
      "type": "Rest",
      "focus": "Active Recovery",
      "description": "Light stretching or walking"
    }
  ],
  "notes": "General programme notes and progression tips"
}

Rules:
- Include all 7 days (Monday through Sunday)
- type must be one of: "Strength", "Cardio", "Rest", "Hybrid"
- For Strength/Hybrid days include an exercises array with specific exercises, sets, reps and notes
- For Cardio days include duration and a detailed description
- For Rest days include a short description
- Tailor everything to the user's goal, equipment, fitness level and session duration
- Your response must be raw JSON only. No markdown, no backticks, no code fences, no explanation. Start your response with { and end with }. Nothing before or after the JSON.`;

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      const rawBody = await response.text();
      console.log("[AIProgramme] HTTP status:", response.status);
      console.log("[AIProgramme] Raw response:", rawBody);

      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${rawBody}`);
      }

      const data = JSON.parse(rawBody);
      const text = data.choices?.[0]?.message?.content;
      console.log("[AIProgramme] Extracted text:", text);

      if (!text) {
        throw new Error(`No content in response. Full response: ${rawBody}`);
      }

      // Strip markdown code fences if the model wraps the JSON
      const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

      let parsed: Programme;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(`Failed to parse JSON from response. Raw text: ${cleaned}`);
      }

      setProgramme(parsed);
      setShowForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AIProgramme] Error:", message);
      setErrorDetail(message);
      toast({
        title: "Failed to generate programme",
        description: message.slice(0, 120),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="pt-12 px-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">AI Programme</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {showForm
            ? "Answer the questions below to generate your personalised training plan"
            : "Your personalised weekly training plan"}
        </p>
      </div>

      {showForm ? (
        <div className="px-5 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Primary Goal
            </p>
            <PillGroup
              options={["Fat Loss", "Muscle Gain", "Endurance", "Hybrid Athlete"]}
              value={answers.goal}
              onChange={set("goal")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Training Days Per Week
            </p>
            <PillGroup
              options={["3", "4", "5", "6"]}
              value={answers.daysPerWeek}
              onChange={set("daysPerWeek")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Available Equipment
            </p>
            <PillGroup
              options={["Full Gym", "Home with Weights", "Bodyweight Only"]}
              value={answers.equipment}
              onChange={set("equipment")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Fitness Level
            </p>
            <PillGroup
              options={["Beginner", "Intermediate", "Advanced"]}
              value={answers.fitnessLevel}
              onChange={set("fitnessLevel")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Session Length
            </p>
            <PillGroup
              options={["30 mins", "45 mins", "60 mins", "90 mins"]}
              value={answers.sessionLength}
              onChange={set("sessionLength")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Injuries or Limitations{" "}
              <span className="normal-case font-normal tracking-normal">(optional)</span>
            </p>
            <Textarea
              placeholder="e.g. bad left knee, lower back pain..."
              value={answers.injuries}
              onChange={(e) => set("injuries")(e.target.value)}
              className="resize-none bg-card border-border text-sm"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cardio Preference
            </p>
            <PillGroup
              options={["Running", "Cycling", "Both", "Neither"]}
              value={answers.cardioPreference}
              onChange={set("cardioPreference")}
            />
          </div>

          {errorDetail && (
            <Card className="rounded-2xl border-destructive/40 bg-destructive/10">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-destructive">
                  Error
                </p>
                <p className="text-xs text-muted-foreground break-all leading-relaxed">
                  {errorDetail}
                </p>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!isFormValid || loading}
            onClick={generateProgramme}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate My Programme
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {/* Action row */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              className="flex-1"
            >
              Edit Answers
            </Button>
            <Button
              size="sm"
              onClick={generateProgramme}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Generate New Programme
                </>
              )}
            </Button>
          </div>

          {/* Day cards */}
          {programme?.days.map((day) => (
            <Card key={day.day} className="rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{day.day}</h3>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-0.5 rounded-full",
                      typeColors[day.type] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {day.type}
                  </span>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {day.focus}
                </p>

                {day.exercises && day.exercises.length > 0 && (
                  <div className="space-y-0">
                    {day.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 py-2 border-t border-border first:border-t-0 first:pt-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug">{ex.name}</p>
                          {ex.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>
                          )}
                        </div>
                        {ex.sets && ex.reps && (
                          <p className="text-sm font-semibold text-primary shrink-0">
                            {ex.sets} × {ex.reps}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {day.duration && (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                    <Timer className="h-4 w-4" />
                    {day.duration}
                  </div>
                )}

                {day.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {day.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Coach notes */}
          {programme?.notes && (
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">
                  Coach Notes
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {programme.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
