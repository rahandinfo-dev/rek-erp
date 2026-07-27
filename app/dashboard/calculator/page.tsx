import dynamic from "next/dynamic";

const CalculatorApp = dynamic(
  () => import("@/components/calculator/CalculatorApp"),
  {
    loading: () => (
      <div className="rounded-3xl bg-muted px-6 py-16 text-center text-slate-500">
        بارکردن…
      </div>
    ),
  }
);

export default function CalculatorPage() {
  return (
    <div className="space-y-6">
      <CalculatorApp />
    </div>
  );
}
