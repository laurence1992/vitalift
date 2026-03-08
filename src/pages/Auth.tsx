import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

const COACH_EMAILS = ["larry92roche@gmail.com"];

async function enforceCoachRole(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "coach" as any })
    .eq("id", userId);
  if (error) console.error("Failed to enforce coach role:", error);
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fixingCoach, setFixingCoach] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (!isLogin && password !== confirmPassword) {
        setError("Passwords do not match.");
        toast({ title: "Passwords do not match", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Sign in error:", error);
          setError(error.message);
        } else if (data.user) {
          if (COACH_EMAILS.includes(email.toLowerCase())) {
            await enforceCoachRole(data.user.id);
          }
          toast({ title: "Signed in successfully!" });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          console.error("Sign up error:", error);
          setError(error.message);
        } else if (data.user && !data.session) {
          setMessage("Check your email for a confirmation link, then sign in.");
          toast({ title: "Account created!", description: "Please confirm your email." });
        } else if (data.session && data.user) {
          if (COACH_EMAILS.includes(email.toLowerCase())) {
            await enforceCoachRole(data.user.id);
          }
          toast({ title: "Account created & signed in!" });
        }
      }
    } catch (err: any) {
      console.error("Auth network error:", err);
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  const handleFixCoachAccess = async () => {
    setFixingCoach(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in first. Sign in, then click this again.");
        setFixingCoach(false);
        return;
      }
      if (!COACH_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
        setError("Your email is not in the coach list.");
        setFixingCoach(false);
        return;
      }
      await enforceCoachRole(user.id);
      toast({ title: "Coach access restored!" });
      navigate("/");
      window.location.reload();
    } catch (err: any) {
      console.error("Fix coach error:", err);
      setError("Failed to fix coach access.");
    }
    setFixingCoach(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">VitaLift</h1>
          </div>
          <p className="text-muted-foreground text-xs">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {!isLogin && (
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          {message && <p className="text-sm text-accent font-medium">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        {isLogin && (
          <p className="text-center">
            <Link
              to="/reset-password"
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>

        <div className="text-center pt-2 border-t border-border">
          <button
            onClick={handleFixCoachAccess}
            disabled={fixingCoach}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            {fixingCoach ? "Fixing..." : "Fix my coach access"}
          </button>
        </div>
      </div>
    </div>
  );
}
