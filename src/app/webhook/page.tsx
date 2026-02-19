import { Card } from "@/components/ui/card";

export default function WebhookInfoPage() {
  return (
    <Card className="max-w-3xl border-sky-400/30 bg-slate-900/60 text-slate-100">
      <h1 className="text-2xl font-extrabold text-sky-200">Webhook Gateway</h1>
      <p className="mt-2 text-sm text-slate-300">
        Active endpoint: <span className="font-mono text-sky-100">POST /api/webhook/preorder</span>
      </p>
      <p className="mt-2 text-sm text-slate-300">
        This endpoint receives external pre-order payloads, validates tenant context, and creates linked preorder records.
      </p>
    </Card>
  );
}
