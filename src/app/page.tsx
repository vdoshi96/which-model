import { TaskInput } from "@/components/TaskInput";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[72vh] max-w-4xl flex-col justify-center gap-8">
      <div className="space-y-3">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-secondary">
          which-model
        </p>
        <h1 className="font-mono text-3xl font-semibold leading-tight text-primary sm:text-5xl">
          Match a task to the right model.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-secondary">
          Describe the work. which-model scores public benchmarks against the
          task and returns a ranked shortlist.
        </p>
      </div>
      <TaskInput />
    </section>
  );
}
