import { TaskInput } from "@/components/TaskInput";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-8">
      <div className="space-y-3">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-secondary">
          which-model
        </p>
        <h1 className="font-mono text-4xl font-semibold text-primary sm:text-5xl">
          Find the best LLM for the job.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-secondary">
          Describe the task, then compare recommendations against public
          benchmark data.
        </p>
      </div>
      <TaskInput />
    </section>
  );
}
