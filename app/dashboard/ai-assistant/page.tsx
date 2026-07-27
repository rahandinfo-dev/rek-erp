import dynamic from "next/dynamic";

const AiAssistantClient = dynamic(
  () => import("@/components/ai/AiAssistantClient"),
  {
    loading: () => (
      <div className="rounded-3xl bg-muted px-6 py-16 text-center text-slate-500">
        بارکردن…
      </div>
    ),
  }
);

export default function AiAssistantPage() {
  return <AiAssistantClient />;
}
