"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { competitions, problems } from "@/lib/data";
import { Trophy, Timer, Users, ArrowRight, Code } from "lucide-react";

export default function CompetitionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#030712] p-8">
      <header className="flex justify-between items-center mb-12 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white neon-text">Dashboard</h1>
          <p className="text-gray-400">Welcome back, Runner.</p>
        </div>
        <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/admin")}>
                Admin Panel
            </Button>
            <Button variant="ghost" onClick={() => router.push("/")} className="text-red-400 hover:text-red-300">
                Logout
            </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12">
        {/* Active Competitions Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">Active Protocols</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp, idx) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card hoverEffect className="h-full flex flex-col justify-between group cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant={comp.status === 'active' ? 'success' : comp.status === 'upcoming' ? 'warning' : 'default'}>
                        {comp.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500 font-mono">{comp.id}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                      {comp.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                      {comp.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" /> {comp.startTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {comp.participants}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-cyan-400" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Practice Problems Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Code className="text-violet-400" />
            <h2 className="text-xl font-semibold text-white">Training Modules</h2>
          </div>

          <div className="space-y-4">
            {problems.map((problem, idx) => (
              <motion.div
                key={problem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                onClick={() => router.push(`/problem/${problem.id}`)}
              >
                <Card hoverEffect className="flex items-center justify-between py-4 cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className={`w-2 h-2 rounded-full ${problem.difficulty === 'Easy' ? 'bg-green-500' : problem.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <div>
                      <h4 className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">
                        {problem.id}. {problem.title}
                      </h4>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>{problem.difficulty}</span>
                        <span>Acceptance: {problem.acceptance}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Solve
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
