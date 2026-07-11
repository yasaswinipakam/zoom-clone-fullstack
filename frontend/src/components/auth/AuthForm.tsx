"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticate } from "@/api/auth";
import { useCurrentUser } from "@/context/CurrentUserContext";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { signIn } = useCurrentUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await authenticate(mode, { email, password, ...(isSignup ? { name } : {}) });
      localStorage.setItem("zoom_clone_access_token", result.access_token);
      signIn({ hostId: result.user.id, displayName: result.user.name });
      router.replace("/dashboard");
    } catch (requestError: unknown) {
      setError((requestError as { message?: string })?.message ?? "Unable to continue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1c1c1e] flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-[400px] rounded-2xl bg-[#2c2c2e] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-4">
        <div><p className="text-[#0b5cff] text-sm font-semibold">ZoomMate</p><h1 className="text-2xl font-bold text-white mt-1">{isSignup ? "Create your account" : "Welcome back"}</h1><p className="text-sm text-[#888] mt-1">{isSignup ? "Use an account to own and manage meetings." : "Sign in to continue to your meetings."}</p></div>
        {isSignup && <label className="block text-sm text-[#ccc]">Name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-white" /></label>}
        <label className="block text-sm text-[#ccc]">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-white" /></label>
        <label className="block text-sm text-[#ccc]">Password<input required type="password" minLength={isSignup ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-white" /></label>
        {error && <p role="alert" className="text-sm text-[#ff6b5a]">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-lg bg-[#0b5cff] py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button>
        <p className="text-center text-sm text-[#888]">{isSignup ? "Already have an account?" : "New here?"} <Link className="text-[#4d8dff] hover:underline" href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
        <Link className="block text-center text-sm text-[#888] hover:text-white" href="/dashboard">Continue without an account</Link>
      </form>
    </main>
  );
}
