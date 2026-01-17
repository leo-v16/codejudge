"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CodeEditor from "@/components/CodeEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Play, Trophy, ChevronLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProblemPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  
  const [code, setCode] = useState("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("codejudge_user"));

    const fetchProblem = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
        const res = await fetch(`${backendUrl}/problem/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProblem(data);
          setCode(data.template);
        } else {
          console.error("Problem not found");
        }
      } catch (err) {
        console.error("Failed to fetch problem", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
    fetchLeaderboard();
  }, [id]);

  useEffect(() => {
    if (!problem?.contest_id) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
    const eventSource = new EventSource(`${backendUrl}/contest/${problem.contest_id}/leaderboard/stream`);
    
    eventSource.onmessage = (event) => {
        try {
            let data = JSON.parse(event.data);
            if (typeof data === "string") data = JSON.parse(data);
            if (Array.isArray(data)) setLeaderboard(data);
        } catch (e) {
            console.error("Failed to parse leaderboard update", e);
        }
    };

    return () => eventSource.close();
  }, [problem?.contest_id]);

  useEffect(() => {
      if (username && leaderboard.length > 0) {
          const index = leaderboard.findIndex(e => e.username === username);
          if (index !== -1) setUserRank(index + 1);
          else setUserRank(null);
      } else {
          setUserRank(null);
      }
  }, [leaderboard, username]);

  const fetchLeaderboard = async () => {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
        const res = await fetch(`${backendUrl}/problem/${id}/leaderboard`);
        if (res.ok) {
            const data = await res.json();
            setLeaderboard(Array.isArray(data) ? data : []);
        }
    } catch (err) {
        console.error("Failed to fetch leaderboard", err);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setExecutionResult(null);
    setStatus("idle");

    const currentUsername = username || "anonymous";

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "/api";
      const res = await fetch(`${backendUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          problem: id,
          solution: code
        })
      });

      const data = await res.json();
      setExecutionResult(data);
      
      if (res.ok) {
        if (data.status === "Passed") {
            setStatus("success");
            fetchLeaderboard();
        } else {
            setStatus("error");
        }
      } else {
        setStatus("error");
      }
    } catch (error) {
      setExecutionResult({ output: "Failed to connect to execution server." });
      setStatus("error");
    } finally {
      setIsRunning(false);
    }
  };

  const getEditorGlow = () => {
      // Gold
      if (userRank === 1) return "border-2 border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.4)] bg-gradient-to-b from-yellow-500/5 to-transparent z-20";
      // Silver
      if (userRank === 2) return "border-2 border-gray-300 shadow-[0_0_80px_rgba(209,213,219,0.3)] bg-gradient-to-b from-gray-300/5 to-transparent z-20";
      // Bronze
      if (userRank === 3) return "border-2 border-orange-600 shadow-[0_0_80px_rgba(234,88,12,0.3)] bg-gradient-to-b from-orange-600/5 to-transparent z-20";
      
      return "border-r border-gray-800";
  };

  if (loading) return <div className="p-8 text-white">Loading system protocols...</div>;
  if (!problem) return <div className="p-8 text-white">Protocol not found or unauthorized access.</div>;

  return (
    <div className="h-screen flex flex-col bg-[#030712] overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0f1e] z-30 relative">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
                if (isPreview) {
                    router.back();
                } else if (problem.contest_id && problem.contest_id > 0) {
                    router.push(`/contest/${problem.contest_id}`);
                } else {
                    router.push("/competitions");
                }
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-cyan-500">#{problem.id}</span> {problem.title}
          </h1>
          <Badge variant={problem.difficulty === 'Easy' ? 'success' : 'warning'}>
            {problem.difficulty}
          </Badge>
        </div>
        
        {userRank && userRank <= 3 && (
           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
               <Badge className={cn(
                   "font-bold border-2 shadow-lg px-6 py-1.5 text-base pointer-events-auto",
                   userRank === 1 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500 shadow-yellow-500/20" :
                   userRank === 2 ? "bg-gray-300/20 text-gray-200 border-gray-300 shadow-gray-300/20" :
                   "bg-orange-600/20 text-orange-300 border-orange-600 shadow-orange-600/20"
               )}>
                   Current Rank: #{userRank}
               </Badge>
           </div>
        )}

        <div className="flex items-center gap-4">
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

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Column 1: Description (25%) */}
        <div className="w-1/4 min-w-[300px] bg-[#0a0f1e] overflow-auto custom-scrollbar border-r border-gray-800 p-6 z-10">
            <h2 className="text-xl font-bold text-white mb-4">Description</h2>
            <div className="prose prose-invert max-w-none text-gray-300 text-sm">
                <p className="whitespace-pre-line leading-relaxed">{problem.description}</p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Constraint & Notes</h3>
                <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                    <li>Time Limit: 2.0s</li>
                    <li>Memory Limit: 128MB</li>
                </ul>
            </div>
        </div>

        {/* Column 2: Code Editor (Flexible) - The "IDE" */}
        <div className={cn("flex-1 flex flex-col transition-all duration-700", getEditorGlow())}>
            <div className="flex-1 relative">
                <CodeEditor value={code} onChange={(val) => setCode(val || "")} />
            </div>
            {/* Console */}
            <div className="h-40 bg-[#0a0f1e] border-t border-gray-800 p-4 overflow-auto font-mono text-sm">
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500 uppercase tracking-wider sticky top-0 bg-[#0a0f1e] py-1">
                    <span>Console Output</span>
                    {status === 'success' && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Accepted</span>}
                    {status === 'error' && <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed</span>}
                </div>
                {executionResult && executionResult.status === "Failed" ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-red-400 font-bold">Test Case {executionResult.failed_index} Failed</span>
                            <span className="text-gray-500">Passed: {executionResult.passed_count} / {executionResult.total_count}</span>
                        </div>
                        {executionResult.test_case_input && (
                            <div className="text-xs">Input: <span className="text-gray-300">{executionResult.test_case_input}</span></div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-900/10 p-2 rounded border border-red-900/30 text-red-300 text-xs">
                                Output: {executionResult.output}
                            </div>
                            <div className="bg-green-900/10 p-2 rounded border border-green-900/30 text-green-300 text-xs">
                                Expected: {executionResult.expected_output}
                            </div>
                        </div>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center justify-center h-full text-green-400 gap-2">
                        <CheckCircle className="w-8 h-8" />
                        <span className="font-bold text-lg">All Test Cases Passed!</span>
                        <span className="text-sm text-green-500/70">Passed: {executionResult?.total_count} / {executionResult?.total_count} test cases</span>
                    </div>
                ) : (
                    <pre className={cn("whitespace-pre-wrap text-xs", status === 'error' ? "text-red-400" : "text-gray-300")}>
                        {executionResult?.output || executionResult?.error || "Run your code to see output..."}
                    </pre>
                )}
            </div>
        </div>

        {/* Column 3: Leaderboard (25%) */}
        <div className="w-1/4 min-w-[250px] bg-[#0a0f1e] overflow-hidden flex flex-col border-l border-gray-800 z-10">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2 bg-[#0a0f1e] z-10">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h2 className="font-bold text-white text-sm">Live Standings</h2>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-2 space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    <div className="col-span-2 text-center">#</div>
                    <div className="col-span-7">User</div>
                    <div className="col-span-3 text-right">XP</div>
                </div>
                
                <AnimatePresence>
                {leaderboard.map((entry, index) => (
                    <motion.div 
                        layout
                        key={entry.username}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={cn(
                            "grid grid-cols-12 gap-2 px-3 py-2 rounded-lg items-center text-sm border",
                            entry.username === username ? "bg-cyan-950/30 border-cyan-500/30" : "bg-gray-900/30 border-transparent"
                        )}
                    >
                        <div className="col-span-2 flex justify-center">
                           <div className={cn(
                               "w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs",
                               index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                               index === 1 ? "bg-gray-300/20 text-gray-300" :
                               index === 2 ? "bg-orange-700/20 text-orange-400" : "text-gray-500"
                           )}>
                               {index + 1}
                           </div>
                        </div>
                        <div className="col-span-7 truncate">
                            <span className={cn(
                                "font-medium truncate block", 
                                index === 0 ? "text-yellow-500" : "text-white"
                            )}>
                                {entry.username} {entry.username === username && "(You)"}
                            </span>
                        </div>
                        <div className="col-span-3 text-right text-cyan-400 font-mono font-bold text-xs">
                            {entry.score}
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
                
                {leaderboard.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No submissions yet.
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}