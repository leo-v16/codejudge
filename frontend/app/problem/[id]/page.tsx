"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import CodeEditor from "@/components/CodeEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { problems } from "@/lib/data"; // Import mock data
import { Play, Trophy, FileText, ChevronLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"description" | "submissions" | "leaderboard">("description");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
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

  const fetchLeaderboard = async () => {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        // Fetch problem-specific leaderboard
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

    const username = localStorage.getItem("codejudge_user") || "anonymous";

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          problem: id,
          solution: code
        })
      });

      const data = await res.json();
      setExecutionResult(data);
      
      if (res.ok) {
        if (data.status === "Passed") {
            setStatus("success");
            fetchLeaderboard(); // Refresh leaderboard on success
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

  if (loading) return <div className="p-8 text-white">Loading system protocols...</div>;
  if (!problem) return <div className="p-8 text-white">Protocol not found or unauthorized access.</div>;


  return (
    <div className="h-screen flex flex-col bg-[#030712] overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0f1e]">
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
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500 uppercase tracking-wider sticky top-0 bg-[#0a0f1e] py-1">
                    <span>Console Output</span>
                    {status === 'success' && <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Accepted</span>}
                    {status === 'error' && <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed</span>}
                </div>
                
                {executionResult && executionResult.status === "Failed" ? (
                    <div className="space-y-4">
                        {executionResult.test_case_input && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Input:</p>
                                <div className="bg-gray-900 p-2 rounded border border-gray-800 text-gray-300">
                                    {executionResult.test_case_input}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Actual Output:</p>
                                <div className="bg-red-900/10 p-2 rounded border border-red-900/30 text-red-300 min-h-[60px]">
                                    {executionResult.output}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Expected Output:</p>
                                <div className="bg-green-900/10 p-2 rounded border border-green-900/30 text-green-300 min-h-[60px]">
                                    {executionResult.expected_output}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center justify-center h-full text-green-400 gap-2">
                        <CheckCircle className="w-8 h-8" />
                        <span className="font-bold text-lg">All Test Cases Passed!</span>
                        <div className="text-xs text-green-500/70 font-mono mt-2 bg-green-900/10 p-2 rounded w-full text-center">
                            Output: {executionResult?.output || "(Empty)"}
                        </div>
                    </div>
                ) : (
                    <pre className={cn("whitespace-pre-wrap", status === 'error' ? "text-red-400" : "text-gray-300")}>
                        {executionResult?.output || executionResult?.error || "Run your code to see output..."}
                    </pre>
                )}
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
                    {/* Acceptance Rate Removed */}
                  </div>
               </motion.div>
            </div>
          )}
          
          {activeTab === "leaderboard" && (
             <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Top Solvers
                </h2>
                <Card className="border-cyan-900/30">
                    {leaderboard.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Be the first to solve this!</div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                             <div className="grid grid-cols-12 gap-4 p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                <div className="col-span-2 text-center">Rank</div>
                                <div className="col-span-6">User</div>
                                <div className="col-span-4 text-right">Solved At</div>
                            </div>
                            {leaderboard.map((entry, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-900/30 transition-colors">
                                    <div className="col-span-2 flex justify-center text-gray-400 font-mono">
                                        #{index + 1}
                                    </div>
                                    <div className="col-span-6">
                                        <span className={cn("font-medium", index === 0 ? "text-yellow-500" : "text-white")}>
                                            {entry.username}
                                        </span>
                                    </div>
                                    <div className="col-span-4 text-right text-gray-400 text-sm font-mono">
                                        {new Date(entry.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
