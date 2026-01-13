"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
}

export default function CodeEditor({ value, onChange, language = "python" }: CodeEditorProps) {
  const editorRef = useRef(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // @ts-ignore
    editorRef.current = editor;
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-gray-800 bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          fontFamily: "'Fira Code', 'Geist Mono', monospace",
        }}
      />
    </div>
  );
}
