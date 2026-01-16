"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Timer, Users, ChevronLeft, ArrowRight, Play } from "lucide-react";

export default function ContestPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contest, setContest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [extraInfo, setExtraInfo] = useState(""); 
  const [registrationFields, setRegistrationFields] = useState<{name: string, required: boolean}[]>([]);
  const [userResponses, setUserResponses] = useState<Record<string, string>>({});
  const [isDynamicConfig, setIsDynamicConfig] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"problems" | "leaderboard">("problems");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const user = localStorage.getItem("codejudge_user");
    setUsername(user);

    const fetchContest = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/contest/${id}`);
        if (res.ok) {
          const data = await res.json();
          setContest(data);
          
          if (data.registration_config) {
             try {
                 const parsed = JSON.parse(data.registration_config);
                 if (Array.isArray(parsed)) {
                     setRegistrationFields(parsed);
                     setIsDynamicConfig(true);
                 }
             } catch (e) {
                 // Not JSON, ignore
             }
          }
        } else {

          console.error("Contest not found");
        }
      } catch (err) {
        console.error("Failed to fetch contest", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchLeaderboard = async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
            const res = await fetch(`${backendUrl}/contest/${id}/leaderboard`);
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const checkRegistration = async () => {
        if (!user || !id) return;
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
            const res = await fetch(`${backendUrl}/contest/status?user_id=${user}&contest_id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setRegistered(data.registered);
            }
        } catch (err) {
            console.error("Failed to check registration", err);
        }
    };

    fetchContest();
    checkRegistration();
    fetchLeaderboard();
  }, [id]);

  const handleRegister = async () => {
    if (!username) {
        alert("Please login to register.");
        return;
    }
    
    let submissionInfo = extraInfo;

    // Validate dynamic fields
    if (registrationFields.length > 0) {
        for (const field of registrationFields) {
            if (field.required && !userResponses[field.name]?.trim()) {
                alert(`Please provide: ${field.name}`);
                return;
            }
        }
        submissionInfo = JSON.stringify(userResponses);
    } else if (contest.registration_config && !extraInfo.trim() && !submissionInfo) {
        // Fallback validation for old string config
         alert(`Please provide: ${contest.registration_config}`);
         return;
    }

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/contest/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                user_id: username, 
                contest_id: Number(id),
                extra_info: submissionInfo
            })
        });
        if (res.ok) {
            setRegistered(true);
            alert("Successfully registered for the protocol!");
        } else {
            alert("Registration failed.");
        }
    } catch (err) {
        console.error(err);
        alert("Error during registration.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">Initializing protocol...</div>;
  if (!contest) return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center text-white gap-4">
        <p>Protocol not found.</p>
        <Button variant="outline" onClick={() => router.push("/competitions")}>
            Return to Dashboard
        </Button>
    </div>
  );

  const status = new Date() < new Date(contest.start_time) ? 'upcoming' : new Date() > new Date(contest.end_time) ? 'ended' : 'active';
  const startTime = new Date(contest.start_time).toLocaleString();
  const endTime = new Date(contest.end_time).toLocaleString();
  
  // Logic to show problems: 
  const showProblems = status === 'active' || status === 'ended';

  return (
    <div className="min-h-screen bg-[#030712] p-8">
      <header className="max-w-4xl mx-auto mb-12">
        <Button variant="ghost" size="sm" onClick={() => router.push("/competitions")} className="mb-6">
          <ChevronLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </Button>
        
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-white neon-text">{contest.title}</h1>
                    <Badge variant={status === 'active' ? 'success' : status === 'upcoming' ? 'warning' : 'default'}>
                        {status.toUpperCase()}
                    </Badge>
                </div>
                <p className="text-gray-400 max-w-2xl">{contest.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                {!registered && status === 'upcoming' && (
                    <>
                        {isDynamicConfig ? (
                            registrationFields.length > 0 && (
                                <div className="w-72 space-y-3 mb-2 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                                    <p className="text-xs text-cyan-400 font-medium mb-1">Registration Requirements</p>
                                    {registrationFields.map((field, idx) => (
                                        <div key={idx}>
                                            <label className="text-xs text-gray-400 mb-1 block">
                                                {field.name} {field.required && <span className="text-red-400">*</span>}
                                            </label>
                                            <input 
                                                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                                                placeholder={`Enter ${field.name}...`}
                                                value={userResponses[field.name] || ""}
                                                onChange={(e) => setUserResponses({...userResponses, [field.name]: e.target.value})}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (contest.registration_config && contest.registration_config.trim() !== "") ? (
                            <div className="w-64">
                                <label className="text-xs text-cyan-400 mb-1 block">
                                    Required: {contest.registration_config}
                                </label>
                                <input 
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white mb-2 focus:border-cyan-500 outline-none"
                                    placeholder="Enter details..."
                                    value={extraInfo}
                                    onChange={(e) => setExtraInfo(e.target.value)}
                                />
                            </div>
                        ) : null}
                        <Button variant="primary" onClick={handleRegister}>
                            Register Now
                        </Button>
                    </>
                )}
                {registered && (
                    <Badge variant="success" className="px-4 py-2 text-sm">
                        Registered
                    </Badge>
                )}
            </div>
        </div>

        <div className="flex gap-8 mt-8 border-y border-gray-800 py-6">
            <div>
                <p className="text-sm text-gray-500 mb-1">Start Time</p>
                <div className="flex items-center gap-2 text-white">
                    <Timer className="w-4 h-4 text-cyan-500" />
                    {startTime}
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-500 mb-1">End Time</p>
                <div className="flex items-center gap-2 text-white">
                    <Timer className="w-4 h-4 text-violet-500" />
                    {endTime}
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-500 mb-1">Participants</p>
                <div className="flex items-center gap-2 text-white">
                    <Users className="w-4 h-4 text-gray-500" />
                    {contest.participants || 0}
                </div>
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-4 border-b border-gray-800 pb-2 mb-6">
            <button
                onClick={() => setActiveTab("problems")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "problems" ? "border-cyan-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
                Problems
            </button>
            <button
                onClick={() => setActiveTab("leaderboard")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "leaderboard" ? "border-cyan-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
                Leaderboard
            </button>
        </div>

        {activeTab === "problems" ? (
           <>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-cyan-500" /> Mission Directives
            </h2>

            {showProblems ? (
                contest.problems && contest.problems.length > 0 ? (
                    <div className="grid gap-4">
                        {contest.problems.map((problem: any, idx: number) => (
                            <motion.div
                                key={problem.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => router.push(`/problem/${problem.id}`)}
                            >
                                <Card hoverEffect className="flex items-center justify-between py-4 cursor-pointer group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-mono text-sm group-hover:bg-cyan-900/50 group-hover:text-cyan-400 transition-colors">
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-200 group-hover:text-cyan-400 transition-colors">
                                                {problem.title}
                                            </h4>
                                            <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                                <span>{problem.difficulty}</span>
                                                <span>{problem.contest_id ? "Contest Problem" : "Practice"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Solve <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-gray-800 rounded-lg bg-gray-900/20">
                        <p className="text-gray-500">No directives found for this protocol.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-12 border border-gray-800 rounded-lg bg-gray-900/20">
                    <p className="text-gray-400 font-medium">Protocol Locked</p>
                    <p className="text-gray-600 text-sm mt-2">Mission directives will be decrypted at start time.</p>
                </div>
            )}
           </>
        ) : (
            <Card className="border-cyan-900/30">
                {leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No records found.</div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        <div className="grid grid-cols-12 gap-4 p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-2 text-center">Rank</div>
                            <div className="col-span-7">User</div>
                            <div className="col-span-3 text-right">Score</div>
                        </div>
                        {leaderboard.map((entry, index) => (
                            <div key={entry.username} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-900/30 transition-colors">
                                <div className="col-span-2 flex justify-center text-gray-400 font-mono">
                                    #{index + 1}
                                </div>
                                <div className="col-span-7">
                                    <span className={`font-medium ${index === 0 ? "text-yellow-500" : "text-white"}`}>
                                        {entry.username}
                                    </span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className="font-mono text-cyan-400 font-bold">{entry.score} XP</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        )}
      </main>
    </div>
  );
}
