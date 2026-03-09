import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dumbbell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Program = { id: string; name: string; description: string | null };

export default function SelfAssignProgram({ onAssigned }: { onAssigned: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("programs")
      .select("id, name, description")
      .eq("coach_id", user.id)
      .order("name")
      .then(({ data }) => {
        setPrograms((data as Program[]) || []);
        setLoading(false);
      });
  }, [user]);

  const handleAssign = async (programId: string) => {
    if (!user) return;
    setAssigning(programId);

    // Deactivate any existing self-assignments
    await supabase
      .from("client_program_assignments")
      .update({ is_active: false })
      .eq("client_id", user.id)
      .eq("is_active", true);

    // Create new assignment
    const { error } = await supabase
      .from("client_program_assignments")
      .insert({ client_id: user.id, program_id: programId, is_active: true });

    if (error) {
      toast({ title: "Error assigning program", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Program assigned!" });
      onAssigned();
    }
    setAssigning(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-32 bg-[#1C1C2E] rounded-xl animate-pulse" />
              <div className="h-2.5 w-20 bg-[#242438] rounded-xl animate-pulse" />
            </div>
            <div className="h-9 w-20 bg-[#1C1C2E] rounded-xl animate-pulse shrink-0 ml-3" />
          </div>
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">No programs created yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create a program first, then assign it to yourself here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Select a program to assign to yourself:</p>
      {programs.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
            {p.description && (
              <p className="text-xs text-muted-foreground truncate">{p.description}</p>
            )}
          </div>
          <Button
            size="sm"
            className="ml-3 shrink-0"
            disabled={assigning === p.id}
            onClick={() => handleAssign(p.id)}
          >
            {assigning === p.id ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Assign
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
