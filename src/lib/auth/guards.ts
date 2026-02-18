import { NextResponse } from "next/server";
import { UserRole } from "@/types/domain";
import { ApiResponse } from "@/types/domain";
import { getRequestClaims } from "@/lib/auth/session";
import { NextRequest } from "next/server";

type RequireRolesResult =
  | { ok: true; claims: NonNullable<Awaited<ReturnType<typeof getRequestClaims>>> }
  | { ok: false; response: NextResponse<ApiResponse> };

export async function requireRoles(req: NextRequest, roles: UserRole[]): Promise<RequireRolesResult> {
  const claims = await getRequestClaims(req);
  if (!claims) {
    return {
      ok: false,
      response: NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 })
    };
  }

  if (!roles.includes(claims.role)) {
    return {
      ok: false,
      response: NextResponse.json<ApiResponse>({ success: false, error: "Forbidden" }, { status: 403 })
    };
  }

  return { ok: true, claims };
}
