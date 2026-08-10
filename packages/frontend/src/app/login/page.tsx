"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, Award } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth, getRoleHome } from "@/lib/auth/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { Modal } from "@/components/ui/Modal";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.ok && result.user) {
      if (result.user.role === "teacher" && result.user.isClassTeacher) {
        setPendingUser(result.user);
        setShowRoleModal(true);
      } else {
        toast.success(`Welcome back, ${result.user.name.split(" ")[0]}!`);
        router.replace(getRoleHome(result.user.role));
      }
    } else {
      toast.error(result.error || "Invalid email or password");
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url('/assets/background_login.jpg')` }}
      />
      {/* Dark Maroon Gradient Overlay - Matching Old Look */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(123, 29, 60, 0.92) 0%, rgba(80, 20, 45, 0.88) 100%)",
        }}
      />

      {/* Floating Background Blobs - Matching old size/positions with animations */}
      <div className="absolute top-[-180px] right-[-120px] w-[500px] h-[500px] rounded-full bg-[#7b1d3c]/20 blur-[100px] animate-blob-1 pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-80px] w-[350px] h-[350px] rounded-full bg-[#9b2d54]/20 blur-[80px] animate-blob-2 pointer-events-none" />

      {/* Centered Glass Morphism Card */}
      <div
        className="relative w-full max-w-[420px] rounded-[20px] border shadow-[0_25px_50px_rgba(0,0,0,0.3)] p-10 card-pop-in z-10"
        style={{
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Glow effect at the top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />

        <div className="mb-6 flex flex-col items-center text-center">
          {/* Logo with exactly 70px height */}
          <div className="mb-4 flex items-center justify-center p-1 bg-white/40 rounded-[12px] border border-white/40 shadow-sm">
            <img
              src="/assets/logo.jpg"
              alt="YEMS Logo"
              className="h-[70px] rounded-[10px] object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Yeshua Educational System
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7b1d3c] mt-1.5">
              Staff &amp; Student Portal
            </p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Sign in to your YEMS account
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5 ml-1">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="email@yems.local"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4 text-gray-500" />}
              className="!bg-white/90 !border-gray-300 !text-gray-950 placeholder:!text-gray-400 focus:!border-maroon focus:!ring-maroon/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5 ml-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4 text-gray-500" />}
              className="!bg-white/90 !border-gray-300 !text-gray-950 placeholder:!text-gray-400 focus:!border-maroon focus:!ring-maroon/20"
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-maroon focus:ring-maroon/20 accent-[#7b1d3c] cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-xs font-medium text-gray-700 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-2 w-full bg-maroon hover:bg-maroon-dark text-white font-semibold shadow-md shadow-maroon/10 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border-none"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              "Sign In →"
            )}
          </Button>
        </form>

        {/* Decorative divider & Apply for Admission link from original index.html */}
        <div className="mt-6 pt-5 border-t border-dashed border-gray-300 text-center">
          <p className="text-xs text-gray-500 mb-2">New Student?</p>
          <a
            href="/admin/admissions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7b1d3c] hover:text-[#9b2d54] transition-colors"
          >
            <Award className="h-4 w-4" /> Apply for Admission
          </a>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <Link
            href="/"
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest font-semibold"
          >
            Super Admin Access
          </Link>
        </div>
      </div>

      <Modal
        open={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Select Portal Mode"
        size="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-gray-600 text-center">
            You are registered as both a Subject Teacher and a Class Teacher. Select which view you want to open:
          </p>
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={() => {
                setShowRoleModal(false);
                if (pendingUser) {
                  toast.success(`Welcome back, ${pendingUser.name.split(" ")[0]}!`);
                  sessionStorage.setItem("teacher_portal_mode", "class-teacher");
                  router.replace("/teacher/class-teacher");
                }
              }}
              className="w-full bg-[#7b1d3c] hover:bg-[#9b2d54] text-white py-3 rounded-xl font-bold shadow-md transition-all border-none cursor-pointer"
            >
              Class Teacher Portal
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowRoleModal(false);
                if (pendingUser) {
                  toast.success(`Welcome back, ${pendingUser.name.split(" ")[0]}!`);
                  sessionStorage.setItem("teacher_portal_mode", "subject-teacher");
                  router.replace("/teacher");
                }
              }}
              className="w-full py-3 rounded-xl font-bold cursor-pointer"
            >
              Subject Teacher Portal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
