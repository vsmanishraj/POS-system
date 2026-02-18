import { redirect } from "next/navigation";

export default function DashboardLandingPage() {
  redirect("/dashboard/admin");
}
