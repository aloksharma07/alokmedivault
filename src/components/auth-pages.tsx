import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, HeartPulse, MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [hospital, setHospital] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const title = mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : "Welcome back";

  async function goToWorkspace() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      await navigate({ to: "/login" });
      return;
    }
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
    const destination = roleRow?.role === "doctor" ? "/doctor/dashboard" : roleRow?.role === "admin" ? "/admin/dashboard" : "/dashboard";
    await navigate({ to: destination });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      if (mode === "register") {
        if (name.trim().length < 2) throw new Error("Enter your full name.");
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new Error("Use at least 8 characters with a letter and a number.");
        }
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: name.trim(), phone: phone.trim(), role, specialization: specialization.trim(), hospital: hospital.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Check your email to confirm your account. You can sign in after confirming.");
          return;
        }
        await goToWorkspace();
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const { data: profile } = await supabase.from("profiles").select("is_active").eq("user_id", authData.user.id).maybeSingle();
          if (profile && !profile.is_active) {
            await supabase.auth.signOut();
            throw new Error("This account has been deactivated. Please contact the administrator.");
          }
          await supabase.rpc("log_activity", { _action: "Login", _details: "Logged in" });
        }
        await goToWorkspace();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage("If an account uses that email, password-reset instructions are on the way.");
      } else {
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new Error("Use at least 8 characters with a letter and a number.");
        }
        if (password !== confirmPassword) throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Your password has been updated.");
        await goToWorkspace();
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  async function socialSignIn(provider: "google" | "lovable") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (!result.redirected) await goToWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in did not complete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link to="/" className="brand-lockup auth-brand"><span className="brand-mark"><HeartPulse size={20} /></span><strong>MediVault</strong></Link>
        <div className="auth-aside-copy">
          <span className="eyebrow">A clearer health history</span>
          <h1>Every report, ready when you need it.</h1>
          <p>Keep records from different clinics together. Share one report at a time, and stay in control of access.</p>
          <div className="auth-assurance"><ShieldCheck size={17} /><span>Private by default. Shared only when you choose.</span></div>
        </div>
        <small>MediVault does not provide medical advice or diagnosis.</small>
      </section>

      <section className="auth-main">
        <div className="auth-mobile-brand"><span className="brand-mark"><HeartPulse size={20} /></span><strong>MediVault</strong></div>
        <div className="auth-panel">
          <Link to="/" className="back-link"><ArrowLeft size={16} /> Home</Link>
          <span className="eyebrow">Secure access</span>
          <h2>{title}</h2>
          <p className="auth-intro">{mode === "register" ? "Start building your private medical record." : mode === "forgot" ? "We’ll send a link to reset your password." : mode === "reset" ? "Use a new password for your account." : "Sign in to your health record."}</p>

          {mode === "login" && (
            <div className="social-stack">
              <Button type="button" variant="outline" className="social-button" disabled={busy} onClick={() => void socialSignIn("google")}>Continue with Google</Button>
              <Button type="button" variant="outline" className="social-button" disabled={busy} onClick={() => void socialSignIn("lovable")}>Continue with Lovable</Button>
              <div className="auth-divider"><span>or use email</span></div>
            </div>
          )}

          {message && <div className="notice-message" role="status"><MailCheck size={18} /><span>{message}</span></div>}
          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            {mode === "register" && <>
              <div className="form-field"><Label htmlFor="name">Full name</Label><Input id="name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="form-field"><Label htmlFor="role">I am joining as</Label>
                <div className="segmented-choice" role="group" aria-label="Account type">
                  <Button type="button" variant={role === "patient" ? "default" : "outline"} onClick={() => setRole("patient")}>Patient</Button>
                  <Button type="button" variant={role === "doctor" ? "default" : "outline"} onClick={() => setRole("doctor")}>Doctor</Button>
                </div>
              </div>
              <div className="form-field"><Label htmlFor="phone">Phone</Label><Input id="phone" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
              {role === "doctor" && <>
                <div className="form-field"><Label htmlFor="specialization">Specialization</Label><Input id="specialization" value={specialization} onChange={(event) => setSpecialization(event.target.value)} /></div>
                <div className="form-field"><Label htmlFor="hospital">Hospital or clinic</Label><Input id="hospital" value={hospital} onChange={(event) => setHospital(event.target.value)} /></div>
              </>}
            </>}
            {mode !== "reset" && <div className="form-field"><Label htmlFor="email">Email address</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>}
            {(mode === "login" || mode === "register" || mode === "reset") && <div className="form-field"><Label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</Label><Input id="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} />{mode !== "login" && <small className="field-hint">At least 8 characters, including a letter and a number.</small>}</div>}
            {(mode === "register" || mode === "reset") && <div className="form-field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>}
            {mode === "login" && <div className="forgot-row"><Link to="/forgot-password">Forgot password?</Link></div>}
            <Button type="submit" className="auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in"}<ArrowRight size={17} /></Button>
          </form>

          {(mode === "login" || mode === "register") && <p className="auth-switch">{mode === "login" ? "New to MediVault?" : "Already have an account?"} {mode === "login" ? <Link to="/register">Create an account</Link> : <Link to="/login">Sign in</Link>}</p>}
          {(mode === "forgot" || mode === "reset") && <p className="auth-switch"><Link to="/login">Return to sign in</Link></p>}
          {mode === "register" && <p className="auth-legal">By creating an account, you agree to use MediVault for record keeping only. It does not provide diagnosis or medical advice.</p>}
        </div>
      </section>
    </main>
  );
}