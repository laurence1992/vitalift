import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase sends recovery tokens in the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      // Session will be set automatically by Supabase client
      console.log("Recovery flow detected");
    }
  }, []);

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
        setError(error.message);
      } else {
        setMessage("Password updated! Redirecting...");
        setTimeout(() => navigate("/"), 1500);
      }
    } catch (err: any) {
      console.error("Network error:", err);
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const inputClass = "bg-white text-black placeholder:text-gray-500 caret-black [&]:[-webkit-text-fill-color:black]";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">VitaLift</h1>
          </div>
          <p className="text-muted-foreground text-sm">Set your new password</p>
        </div>
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
      </div>
    </div>
  );
}
