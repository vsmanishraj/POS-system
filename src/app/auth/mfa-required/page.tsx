import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MfaRequiredPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <h1 className="text-xl font-bold">MFA Verification Required</h1>
        <p className="mt-2 text-sm text-gray-600">
          This restaurant has Enterprise MFA enforcement enabled. Complete second-factor verification in your identity
          provider settings, then sign in again.
        </p>
        <div className="mt-4 grid gap-2">
          <Link href="/auth/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full">Return Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
