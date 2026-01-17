"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Terminal, Code2, Lock } from "lucide-react";
import { verifyAdmin } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check Env-based Admin Auth
      const isAdmin = await verifyAdmin(username, password);
      if (isAdmin) {
        localStorage.setItem("codejudge_user", "admin");
        router.push("/competitions");
        return;
      }

      // 2. Check Backend User Auth
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
      const res = await fetch(`${backendUrl}/user/exists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Connection failed");

      const data = await res.json();
      if (!data.exists) {
        throw new Error("Invalid identity credentials");
      }

      // Store username in localStorage for "session"
      localStorage.setItem("codejudge_user", username);
      router.push("/competitions");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md p-4"
      >
        <Card className="border-t border-t-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 mb-4 shadow-lg shadow-cyan-500/20">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Code Judge
            </h1>
            <p className="text-gray-400 mt-2">Enter the arena of code.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Identity</label>
                <div className="relative">
                  <Terminal className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <Input
                    placeholder="username"
                    className="pl-10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="primary"
              disabled={loading}
            >
              {loading ? "Initializing..." : "Jack In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
             <Link href="/register" className="text-gray-500 hover:text-cyan-400 transition-colors">
               New here? Register
             </Link>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>System v2.0.4 // Ready</p>
            <p className="text-xs mt-2 text-gray-600">Hint: Use 'admin' for elevated privileges.</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}