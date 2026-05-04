"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export function TaskInput() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const trimmedTask = task.trim();

    if (!trimmedTask) {
      setError("Describe the task first.");
      return;
    }

    const params = new URLSearchParams({ task: trimmedTask });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <Textarea
        maxLength={500}
        onChange={(event) => {
          setTask(event.target.value);
          setError("");
        }}
        placeholder="Describe what you need an LLM to do..."
        value={task}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs text-secondary">{task.length}/500</span>
        <Button onClick={handleSubmit}>Find Best Models</Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
