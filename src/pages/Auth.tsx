import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const authInputClass =
  "text-foreground caret-foreground placeholder:text-muted-foreground [&]:[-webkit-text-fill-color:hsl(var(--foreground))]";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (forgotMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          console.error("Password reset error:", error);
          setError(error.message);
        } else {
          setMessage("Check your email for a password reset link!");
          toast({ title: "Reset email sent", description: "Check your inbox." });
        }
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Sign in error:", error);
          setError(error.message);
        } else {
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
        } else if (data.session) {
          toast({ title: "Account created & signed in!" });
        }
      }
    } catch (err: any) {
      console.error("Auth network error:", err);
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">VitaLift</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {forgotMode
              ? "Reset your password"
              : isLogin
              ? "Sign in to your account"
              : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !forgotMode && (
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={authInputClass}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={authInputClass}
          />
          {!forgotMode && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={authInputClass}
            />
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          {message && <p className="text-sm text-primary font-medium">{message}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Loading..."
              : forgotMode
              ? "Send Reset Link"
              : isLogin
              ? "Sign In"
              : "Sign Up"}
          </Button>
        </form>

        {isLogin && !forgotMode && (
          <p className="text-center">
            <button
              onClick={() => { setForgotMode(true); setError(""); setMessage(""); }}
              className="text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              Forgot password?
            </button>
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {forgotMode ? (
            <button
              onClick={() => { setForgotMode(false); setError(""); setMessage(""); }}
              className="text-primary font-medium hover:underline"
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
