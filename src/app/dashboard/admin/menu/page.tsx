import { Card } from "@/components/ui/card";

export default function AdminMenuPage() {
  return (
    <Card>
      <h1 className="text-xl font-bold">Menu CRUD</h1>
      <p className="mt-2 text-sm text-gray-600">Create, edit, activate/deactivate menu items with category-level mapping and price controls.</p>
      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded border p-3">Margherita Pizza - $12.50 - Enabled</div>
        <div className="rounded border p-3">Caesar Salad - $8.75 - Enabled</div>
      </div>
    </Card>
  );
}
