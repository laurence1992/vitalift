import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  const inputClass =
    "bg-white text-black placeholder:text-gray-500 caret-black [&]:[-webkit-text-fill-color:black]";

  useEffect(() => {
    // Check hash and query params for errors or recovery tokens
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash.replace("#", ""));

    const errorCode =
      params.get("error_code") || hashParams.get("error_code");
    const errorDesc =
      params.get("error_description") || hashParams.get("error_description");

    if (errorCode === "otp_expired" || errorDesc?.includes("expired")) {
      setExpired(true);
      return;
    }

    if (
      params.get("error") ||
      hashParams.get("error") ||
      errorCode === "access_denied"
    ) {
      setExpired(true);
      return;
    }

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );

    // Also check if we already have a session (recovery link sets one)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    // Give it a few seconds then show ready anyway (token may already be consumed)
    const timeout = setTimeout(() => setReady(true), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">VitaLift</h1>
          </div>
          <p className="text-muted-foreground">
            This reset link has expired. Please request a new one.
          </p>
          <Button asChild className="w-full">
            <Link to="/reset-password">Request New Reset Link</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("Update password error:", error);
        if (error.message.includes("expired") || error.message.includes("invalid")) {
          setExpired(true);
        } else {
          setError(error.message);
        }
      } else {
        setMessage("Password updated! Redirecting to sign in...");
        await supabase.auth.signOut();
        setTimeout(() => navigate("/auth"), 1500);
      }
    } catch (err: any) {
      console.error("Network error:", err);
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">VitaLift</h1>
          </div>
          <p className="text-muted-foreground text-sm">Set your new password</p>
        </div>
        {!ready ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            {message && <p className="text-sm text-green-500 font-medium">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary font-medium hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
