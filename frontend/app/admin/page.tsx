"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Save, Plus, Calendar, Trophy, Users, Trash2, PlusCircle } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<"problem" | "contest">("problem");
  const [editingProblemId, setEditingProblemId] = useState<number | null>(null);

  // Problem Form State
  const [problemData, setProblemData] = useState({
    title: "",
    description: "",
    input: "",
    output: "",
    template: "",
    runner_code: "",
    difficulty: "Medium",
    points: 10,
    contest_id: 0
  });

  // Contest Form State
  const [contestData, setContestData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: ""
  });
  
  const [registrationFields, setRegistrationFields] = useState<{name: string, required: boolean}[]>([]);

  const [contests, setContests] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [viewingRegistrationsContestId, setViewingRegistrationsContestId] = useState<number | null>(null);
  const [editingContestId, setEditingContestId] = useState<number | null>(null);

  useEffect(() => {
    // Check Auth
    const user = localStorage.getItem("codejudge_user");
    if (user !== "admin") {
      router.push("/competitions");
    } else {
      setAuthorized(true);
      fetchContests();
      fetchProblems();
    }
  }, [router]);

  const fetchContests = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/contests`);
      if (res.ok) {
        const data = await res.json();
        setContests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch contests", err);
    }
  };

  const fetchRegistrations = async (contestId: number) => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/contest/${contestId}/registrations`);
        if (res.ok) {
            const data = await res.json();
            setRegistrations(Array.isArray(data) ? data : []);
            setViewingRegistrationsContestId(contestId);
        }
      } catch (err) {
          console.error(err);
      }
  };

  const fetchProblems = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${backendUrl}/problems`);
      if (res.ok) {
        const data = await res.json();
        setProblems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch problems", err);
    }
  };

  const handleEditProblem = (problem: any) => {
      setEditingProblemId(problem.id);
      setProblemData({
          title: problem.title,
          description: problem.description,
          input: problem.input,
          output: problem.output,
          template: problem.template,
          runner_code: problem.runner_code || "",
          difficulty: problem.difficulty,
          points: problem.points || 10,
          contest_id: problem.contest_id
      });
  };

  const handleProblemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const method = editingProblemId ? "PUT" : "POST";
      const body = {
        ...problemData,
        contest_id: Number(problemData.contest_id),
        points: Number(problemData.points),
        id: editingProblemId || undefined
      };
      
      const res = await fetch(`${backendUrl}/problem`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingProblemId ? "Problem updated successfully!" : "Problem created successfully!");
        setProblemData({
          title: "",
          description: "",
          input: "",
          output: "",
          template: "",
          runner_code: "",
          difficulty: "Medium",
          points: 10,
          contest_id: 0
        });
        setEditingProblemId(null);
        fetchProblems();
      } else {
        alert("Failed to save problem.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting problem.");
    }
  };

  const handleDeleteProblem = async (id: number) => {
      if (!confirm("Are you sure you want to delete this problem?")) return;
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/problem/${id}`, {
            method: "DELETE",
        });
        if (res.ok) {
            alert("Problem deleted successfully!");
            if (editingProblemId === id) {
                setEditingProblemId(null);
                setProblemData({
                    title: "",
                    description: "",
                    input: "",
                    output: "",
                    template: "",
                    runner_code: "",
                    difficulty: "Medium",
                    points: 10,
                    contest_id: 0
                });
            }
            fetchProblems();
        } else {
            alert("Failed to delete problem.");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting problem.");
      }
  };

  const handleDeleteContest = async (id: number) => {
      if (!confirm("Are you sure you want to delete this contest?")) return;
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${backendUrl}/contest/${id}`, {
            method: "DELETE",
        });
        if (res.ok) {
            alert("Contest deleted successfully!");
            if (editingContestId === id) {
                setEditingContestId(null);
                setContestData({ title: "", description: "", start_time: "", end_time: "" });
                setRegistrationFields([]);
            }
            fetchContests();
        } else {
            alert("Failed to delete contest.");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting contest.");
      }
  };

  const handleEditContest = (contest: any) => {
      setEditingContestId(contest.id);
      const formatTime = (isoString: string) => {
          const date = new Date(isoString);
          return date.toISOString().slice(0, 16);
      };

      let parsedFields = [];
      try {
          if (contest.registration_config) {
            parsedFields = JSON.parse(contest.registration_config);
          }
      } catch (e) {
          // Fallback for old string format (if any)
          if (contest.registration_config) {
               parsedFields = contest.registration_config.split(',').map((s: string) => ({ name: s.trim(), required: true }));
          }
      }

      setContestData({
          title: contest.title,
          description: contest.description,
          start_time: formatTime(contest.start_time),
          end_time: formatTime(contest.end_time)
      });
      setRegistrationFields(parsedFields);
      window.scrollTo(0, 0);
  };

  const handleContestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const method = editingContestId ? "PUT" : "POST";
      const body = {
          ...contestData,
          registration_config: JSON.stringify(registrationFields),
          start_time: new Date(contestData.start_time).toISOString(),
          end_time: new Date(contestData.end_time).toISOString(),
          id: editingContestId || undefined
      };

      const res = await fetch(`${backendUrl}/contest`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert(editingContestId ? "Contest updated successfully!" : "Contest created successfully!");
        setContestData({ title: "", description: "", start_time: "", end_time: "" });
        setRegistrationFields([]);
        setEditingContestId(null);
        fetchContests();
      } else {
        alert("Failed to save contest.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting contest.");
    }
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[#030712] p-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Admin Console</h1>
        </div>
        <div className="flex gap-2">
            <Button 
                variant={activeTab === "contest" ? "primary" : "outline"} 
                onClick={() => setActiveTab("contest")}
                size="sm"
            >
                <Trophy className="w-4 h-4 mr-2" /> Contests
            </Button>
            <Button 
                variant={activeTab === "problem" ? "primary" : "outline"} 
                onClick={() => setActiveTab("problem")}
                size="sm"
            >
                <Plus className="w-4 h-4 mr-2" /> Problems
            </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {activeTab === "contest" ? (
             <div className="space-y-8">
                 {viewingRegistrationsContestId ? (
                     <Card className="border-cyan-900/30">
                         <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4 justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="text-cyan-500" />
                                <h2 className="text-xl font-semibold text-white">Registrations for Contest #{viewingRegistrationsContestId}</h2>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setViewingRegistrationsContestId(null)}>
                                Close
                            </Button>
                         </div>
                         <div className="space-y-4">
                             {registrations.length === 0 && <p className="text-gray-500">No registrations found.</p>}
                             {registrations.map(reg => (
                                 <div key={reg.id} className="p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                                     <div className="flex justify-between">
                                         <span className="text-white font-medium">{reg.user_id}</span>
                                         <span className="text-gray-500 text-sm">{new Date(reg.registered_at).toLocaleString()}</span>
                                     </div>
                                     {reg.extra_info && (
                                         <div className="mt-2 text-sm text-gray-400 bg-gray-950 p-2 rounded">
                                             {reg.extra_info}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </Card>
                 ) : (
                    <>
                        <Card className="border-cyan-900/30">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                        <Trophy className="text-cyan-500" />
                        <h2 className="text-xl font-semibold text-white">{editingContestId ? "Edit Contest" : "Create New Contest"}</h2>
                        {editingContestId && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-auto"
                                onClick={() => {
                                    setEditingContestId(null);
                                    setContestData({ title: "", description: "", start_time: "", end_time: "" });
                                    setRegistrationFields([]);
                                }}
                            >
                                Cancel Edit
                            </Button>
                        )}
                        </div>
            
                        <form onSubmit={handleContestSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Contest Title</label>
                            <Input 
                            value={contestData.title}
                            onChange={(e) => setContestData({...contestData, title: e.target.value})}
                            placeholder="e.g., Weekly Contest 404"
                            required
                            />
                        </div>
            
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Description</label>
                            <textarea 
                            className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:border-cyan-500 focus:outline-none"
                            value={contestData.description}
                            onChange={(e) => setContestData({...contestData, description: e.target.value})}
                            placeholder="Brief description..."
                            required
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm text-gray-400">Registration Requirements</label>
                            <div className="space-y-2">
                                {registrationFields.map((field, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Input 
                                            placeholder="Field Name (e.g. T-Shirt Size)" 
                                            value={field.name}
                                            onChange={(e) => {
                                                const newFields = [...registrationFields];
                                                newFields[idx].name = e.target.value;
                                                setRegistrationFields(newFields);
                                            }}
                                        />
                                        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded px-3 h-10">
                                            <input 
                                                type="checkbox" 
                                                checked={field.required}
                                                onChange={(e) => {
                                                    const newFields = [...registrationFields];
                                                    newFields[idx].required = e.target.checked;
                                                    setRegistrationFields(newFields);
                                                }}
                                                className="w-4 h-4 accent-cyan-500"
                                            />
                                            <span className="text-xs text-gray-400">Required</span>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => {
                                                const newFields = registrationFields.filter((_, i) => i !== idx);
                                                setRegistrationFields(newFields);
                                            }}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setRegistrationFields([...registrationFields, { name: "", required: false }])}
                                    className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" /> Add Field
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Start Time</label>
                                <Input 
                                    type="datetime-local"
                                    value={contestData.start_time}
                                    onChange={(e) => setContestData({...contestData, start_time: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">End Time</label>
                                <Input 
                                    type="datetime-local"
                                    value={contestData.end_time}
                                    onChange={(e) => setContestData({...contestData, end_time: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
            
                        <div className="pt-4 flex justify-end gap-3">
                            {editingContestId && (
                                <Button type="button" variant="outline" onClick={() => handleDeleteContest(editingContestId)} className="text-red-400 border-red-900/50 hover:bg-red-900/20">
                                    Delete Contest
                                </Button>
                            )}
                            <Button type="submit" variant="primary">
                            <Save className="w-4 h-4" /> {editingContestId ? "Update Contest" : "Create Contest"}
                            </Button>
                        </div>
                        </form>
                    </Card>

                    <Card className="border-cyan-900/30">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                            <Trophy className="text-cyan-500" />
                            <h2 className="text-xl font-semibold text-white">Existing Contests</h2>
                        </div>
                        <div className="space-y-4">
                            {contests.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                                    <div>
                                        <h3 className="font-medium text-gray-200">{c.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(c.start_time).toLocaleDateString()} • {c.participants || 0} Participants
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditContest(c)}>
                                            Edit
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => fetchRegistrations(c.id)}>
                                            <Users className="w-4 h-4 mr-2" /> View Registrations
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                   </>
                 )}
             </div>
        ) : (
            <div className="space-y-8">
                <Card className="border-cyan-900/30">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                        <Plus className="text-cyan-500" />
                        <h2 className="text-xl font-semibold text-white">
                            {editingProblemId ? "Edit Problem" : "Create New Problem"}
                        </h2>
                        {editingProblemId && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-auto"
                                onClick={() => {
                                    setEditingProblemId(null);
                                    setProblemData({
                                        title: "",
                                        description: "",
                                        input: "",
                                        output: "",
                                        template: "",
                                        runner_code: "",
                                        difficulty: "Medium",
                                        contest_id: 0
                                    });
                                }}
                            >
                                Cancel Edit
                            </Button>
                        )}
                    </div>

                    <form onSubmit={handleProblemSubmit} className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm text-gray-400">Problem Title</label>
                                <Input 
                                    value={problemData.title}
                                    onChange={(e) => setProblemData({...problemData, title: e.target.value})}
                                    placeholder="e.g., Matrix Inversion"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Difficulty</label>
                                <select 
                                    className="w-full h-10 bg-gray-900/50 border border-gray-700 rounded-lg px-3 text-gray-100 focus:border-cyan-500 focus:outline-none"
                                    value={problemData.difficulty}
                                    onChange={(e) => setProblemData({...problemData, difficulty: e.target.value})}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Points</label>
                                <Input 
                                    type="number"
                                    value={problemData.points}
                                    onChange={(e) => setProblemData({...problemData, points: Number(e.target.value)})}
                                    placeholder="10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Assign to Contest (Optional)</label>
                                <select 
                                    className="w-full h-10 bg-gray-900/50 border border-gray-700 rounded-lg px-3 text-gray-100 focus:border-cyan-500 focus:outline-none"
                                    value={problemData.contest_id}
                                    onChange={(e) => setProblemData({...problemData, contest_id: Number(e.target.value)})}
                                >
                                    <option value={0}>No Contest (Practice)</option>
                                    {contests.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                        <label className="text-sm text-gray-400">Description (Markdown)</label>
                        <textarea 
                            className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:border-cyan-500 focus:outline-none"
                            value={problemData.description}
                            onChange={(e) => setProblemData({...problemData, description: e.target.value})}
                            placeholder="Describe the algorithm challenge..."
                            required
                        />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Test Case Input</label>
                            <textarea 
                            className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                            value={problemData.input}
                            onChange={(e) => setProblemData({...problemData, input: e.target.value})}
                            placeholder="Input data..."
                            required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Expected Output</label>
                            <textarea 
                            className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                            value={problemData.output}
                            onChange={(e) => setProblemData({...problemData, output: e.target.value})}
                            placeholder="Expected result..."
                            required
                            />
                        </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Starter Code Template (User View)</label>
                            <textarea 
                            className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                            value={problemData.template}
                            onChange={(e) => setProblemData({...problemData, template: e.target.value})}
                            placeholder="class Solution:..."
                            required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Hidden Runner Code (Appended to submission)</label>
                            <textarea 
                            className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                            value={problemData.runner_code}
                            onChange={(e) => setProblemData({...problemData, runner_code: e.target.value})}
                            placeholder="if __name__ == '__main__': Solution().solve()..."
                            />
                            <p className="text-xs text-gray-500">This code is hidden from the user but runs after their code to handle input/output.</p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            {editingProblemId && (
                                <Button type="button" variant="outline" onClick={() => handleDeleteProblem(editingProblemId)} className="text-red-400 border-red-900/50 hover:bg-red-900/20">
                                    Delete Protocol
                                </Button>
                            )}
                            <Button type="submit" variant="primary">
                                <Save className="w-4 h-4" /> {editingProblemId ? "Update Protocol" : "Save Protocol"}
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card className="border-cyan-900/30">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                        <Trophy className="text-cyan-500" />
                        <h2 className="text-xl font-semibold text-white">Existing Protocols</h2>
                    </div>
                    <div className="space-y-4">
                        {problems.map(problem => (
                            <div key={problem.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                                <div>
                                    <h3 className="font-medium text-gray-200">{problem.title}</h3>
                                    <p className="text-sm text-gray-500">ID: {problem.id} • Contest: {problem.contest_id || "Practice"}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => router.push(`/problem/${problem.id}?preview=true`)}>
                                        Preview
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEditProblem(problem)}>
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        )}
      </main>
    </div>
  );
}
