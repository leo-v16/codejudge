"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, Mail, Lock, Code2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      
      // Check if user exists
      const existsRes = await fetch(`${backendUrl}/user/exists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.username }),
      });

      if (!existsRes.ok) throw new Error("Connection failed");
      const existsData = await existsRes.json();
      
      if (existsData.exists) {
        throw new Error("Identity already claimed");
      }

      // Create user
      const res = await fetch(`${backendUrl}/user/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register");
      }

      // On success, redirect to login
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md p-4"
      >
        <Card className="border-t border-t-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 mb-4 shadow-lg shadow-violet-500/20">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Join the Arena
            </h1>
            <p className="text-gray-400 mt-2">Create your identity.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <Input
                    name="username"
                    placeholder="codewarrior"
                    className="pl-10"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <Input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="secondary"
              disabled={loading}
            >
              {loading ? "Registering..." : "Initialize Identity"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
