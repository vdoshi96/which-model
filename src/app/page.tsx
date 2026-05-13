import { EvidencePreview } from "@/components/EvidencePreview";
import { SplashScreen } from "@/components/SplashScreen";
import { TaskInput } from "@/components/TaskInput";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return <SplashScreen />;
  }

  return (
    <section className="grid min-h-[calc(100vh-8rem)] min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col justify-center">
        <div className="mb-6 max-w-3xl">
          <h1 className="break-words text-3xl font-semibold leading-[1.04] text-primary sm:text-5xl">
            Match a task to the right model.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary">
            Describe the work. which-model scores public benchmarks against the
            task and returns a ranked shortlist you can immediately compare.
          </p>
        </div>
        <TaskInput />
      </div>
      <div className="flex min-w-0 items-center">
        <EvidencePreview className="w-full" />
      </div>
    </section>
  );
}
