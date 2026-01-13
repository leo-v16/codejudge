"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Save, Plus } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    input: "",
    output: "",
    template: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would POST to the backend
    console.log("Creating problem:", formData);
    alert("Feature pending backend integration. Data logged to console.");
  };

  return (
    <div className="min-h-screen bg-[#030712] p-8">
      <header className="max-w-4xl mx-auto flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Admin Console</h1>
      </header>

      <main className="max-w-4xl mx-auto">
        <Card className="border-cyan-900/30">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
            <Plus className="text-cyan-500" />
            <h2 className="text-xl font-semibold text-white">Create New Protocol</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Problem Title</label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Matrix Inversion"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Description (Markdown)</label>
              <textarea 
                className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 focus:border-cyan-500 focus:outline-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the algorithm challenge..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Test Case Input</label>
                <textarea 
                  className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  value={formData.input}
                  onChange={(e) => setFormData({...formData, input: e.target.value})}
                  placeholder="Input data..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Expected Output</label>
                <textarea 
                  className="w-full h-24 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  value={formData.output}
                  onChange={(e) => setFormData({...formData, output: e.target.value})}
                  placeholder="Expected result..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm text-gray-400">Starter Code Template (Python)</label>
                <textarea 
                  className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  value={formData.template}
                  onChange={(e) => setFormData({...formData, template: e.target.value})}
                  placeholder="class Solution:..."
                />
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary">
                <Save className="w-4 h-4" /> Save Protocol
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
