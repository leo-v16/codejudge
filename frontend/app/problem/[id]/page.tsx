"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import CodeEditor from "@/components/CodeEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { problems, leaderboard as mockLeaderboard } from "@/lib/data"; // Import mock data
import { Play, Trophy, FileText, ChevronLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProblemPage() {
  const { id } = useParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [activeTab, setActiveTab] = useState<"description" | "leaderboard">("description");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Find problem data
  const problem = problems.find((p) => p.id === id);

  useEffect(() => {
    if (problem) {
      setCode(problem.template);
    }
  }, [problem]);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    setStatus("idle");

    const username = localStorage.getItem("codejudge_user") || "anonymous";

    try {
      // Direct call to Go backend
      const res = await fetch("http://localhost:8080/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          problem: id, // Assuming id matches the testcase id in backend (1, 2, etc.)
          solution: code,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setOutput(data.output);
        // Simple heuristic for success/failure since backend just returns raw output
        // In a real app, backend should return status.
        // We'll assume if there's output and no "Traceback", it's good for now, 
        // or compare with expected output if we had it on frontend.
        // For this prototype, we just show the output.
        setStatus("success"); 
      } else {
        setOutput(data.error || "An error occurred");
        setStatus("error");
      }
    } catch (error) {
      setOutput("Failed to connect to execution server.");
      setStatus("error");
    } finally {
      setIsRunning(false);
    }
  };

  if (!problem) return <div className="p-8 text-white">Problem not found</div>;

  return (
    <div className="h-screen flex flex-col bg-[#030712] overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0f1e]">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-500">#{problem.id}</span> {problem.title}
          </h1>
          <Badge variant={problem.difficulty === 'Easy' ? 'success' : 'warning'}>
            {problem.difficulty}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-900 rounded-lg p-1">
             <button
              onClick={() => setActiveTab("description")}
              className={cn("px-4 py-1.5 rounded-md text-sm transition-all", activeTab === "description" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={cn("px-4 py-1.5 rounded-md text-sm transition-all", activeTab === "leaderboard" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}
            >
              Leaderboard
            </button>
          </div>
          
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleRun}
            disabled={isRunning}
            className="min-w-[100px]"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Run</>}
          </Button>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Coding Area */}
        <div className="w-1/2 flex flex-col border-r border-gray-800">
            <div className="flex-1 relative">
                <CodeEditor value={code} onChange={(val) => setCode(val || "")} />
            </div>
            {/* Output Console */}
            <div className="h-48 bg-[#0a0f1e] border-t border-gray-800 p-4 overflow-auto font-mono text-sm">
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500 uppercase tracking-wider">
                    <span>Console Output</span>
                    {status === 'success' && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Executed</span>}
                    {status === 'error' && <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Error</span>}
                </div>
                <pre className={cn("whitespace-pre-wrap", status === 'error' ? "text-red-400" : "text-gray-300")}>
                    {output || "Run your code to see output..."}
                </pre>
            </div>
        </div>

        {/* Right Panel: Info & Leaderboard */}
        <div className="w-1/2 bg-[#0a0f1e] overflow-auto custom-scrollbar">
          {activeTab === "description" && (
            <div className="p-6 space-y-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
                  <div className="prose prose-invert max-w-none text-gray-300">
                    <p className="whitespace-pre-line leading-relaxed">{problem.description}</p>
                  </div>
                  
                  <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Acceptance Rate</h3>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full" style={{ width: problem.acceptance }} />
                    </div>
                    <p className="text-right text-xs text-cyan-400 mt-1">{problem.acceptance}</p>
                  </div>
               </motion.div>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Global Rankings
                    </h2>
                    <span className="text-sm text-gray-500">Live Updates</span>
                </div>

                <div className="space-y-2">
                    {mockLeaderboard.map((entry, idx) => (
                        <motion.div 
                            key={entry.rank}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <div className={cn(
                                "flex items-center justify-between p-4 rounded-lg border",
                                idx === 0 ? "bg-yellow-500/10 border-yellow-500/30" : 
                                idx === 1 ? "bg-gray-400/10 border-gray-400/30" :
                                idx === 2 ? "bg-orange-700/10 border-orange-700/30" : "bg-gray-900 border-gray-800"
                            )}>
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-full font-bold",
                                        idx < 3 ? "bg-white/10 text-white" : "text-gray-500"
                                    )}>{entry.rank}</span>
                                    <span className="font-medium text-gray-200">{entry.username}</span>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-cyan-400 font-mono">{entry.score} pts</span>
                                    <span className="text-gray-500 font-mono">{entry.time}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
