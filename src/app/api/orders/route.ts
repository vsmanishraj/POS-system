import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validations/schemas";
import {
  createOrder,
  sendToKitchen,
  completeOrder,
  listKitchenQueue,
  listRecentOrders,
  listTableOrders,
  updateOrderPriority,
  updateOrderStatus
} from "@/lib/services/order.service";
import { requireRoles } from "@/lib/auth/guards";
import { ApiResponse } from "@/types/domain";
import { createRequestContext, fail, fromError, ok } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "KITCHEN", "CASHIER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  if (!claims.restaurant_id) {
    return fail(ctx, "Missing tenant context", 400, "TENANT_MISSING");
  }

  try {
    const view = req.nextUrl.searchParams.get("view");

    if (view === "kitchen") {
      const data = await listKitchenQueue(claims.restaurant_id);
      return ok(ctx, data);
    }

    if (view === "recent") {
      const data = await listRecentOrders(claims.restaurant_id);
      return ok(ctx, data);
    }

    if (view === "table") {
      const tableId = req.nextUrl.searchParams.get("table_id");
      if (!tableId) {
        return fail(ctx, "table_id required", 400, "VALIDATION_ERROR");
      }
      const data = await listTableOrders(claims.restaurant_id, tableId);
      return ok(ctx, data);
    }

    return fail(ctx, "Unsupported view", 400, "VALIDATION_ERROR");
  } catch (error) {
    return fromError(ctx, error, "Failed to fetch orders");
  }
}

export async function POST(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  try {
    const parsed = createOrderSchema.safeParse(await req.json());

    if (!parsed.success) {
      return fail(ctx, parsed.error.message, 400, "VALIDATION_ERROR");
    }

    if (claims.restaurant_id !== parsed.data.restaurant_id) {
      return fail(ctx, "Cross tenant access denied", 403, "CROSS_TENANT");
    }

    const order = await createOrder({ ...parsed.data, created_by: claims.sub, priority: parsed.data.priority });
    return ok(ctx, order);
  } catch (error) {
    return fromError(ctx, error, "Failed to create order");
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = createRequestContext(req);
  const auth = await requireRoles(req, ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "KITCHEN"]);
  if (!auth.ok) return auth.response;
  const claims = auth.claims;

  try {
    const body = (await req.json()) as {
      action: "SEND_TO_KITCHEN" | "COMPLETE" | "SET_STATUS" | "SET_PRIORITY";
      restaurant_id: string;
      order_id: string;
      payment_method?: "CASH" | "CARD" | "UPI" | "WALLET";
      amount_paid?: number;
      status?: "OPEN" | "KITCHEN" | "READY" | "COMPLETED" | "CANCELLED";
      priority?: "NORMAL" | "HIGH";
    };

    if (claims.restaurant_id !== body.restaurant_id) {
      return fail(ctx, "Cross tenant access denied", 403, "CROSS_TENANT");
    }

    if (body.action === "SEND_TO_KITCHEN") {
      const updated = await sendToKitchen(body.restaurant_id, body.order_id);
      return ok(ctx, updated);
    }

    if (body.action === "SET_STATUS") {
      if (!body.status) {
        return fail(ctx, "status required", 400, "VALIDATION_ERROR");
      }
      const updated = await updateOrderStatus(body.restaurant_id, body.order_id, body.status);
      return ok(ctx, updated);
    }

    if (body.action === "SET_PRIORITY") {
      if (!body.priority) {
        return fail(ctx, "priority required", 400, "VALIDATION_ERROR");
      }
      const updated = await updateOrderPriority(body.restaurant_id, body.order_id, body.priority);
      return ok(ctx, updated);
    }

    if (!body.payment_method || !body.amount_paid) {
      return fail(ctx, "payment_method and amount_paid required", 400, "VALIDATION_ERROR");
    }

    const result = await completeOrder({
      restaurantId: body.restaurant_id,
      orderId: body.order_id,
      paymentMethod: body.payment_method,
      amountPaid: body.amount_paid
    });

    return ok(ctx, result);
  } catch (error) {
    return fromError(ctx, error, "Failed to update order");
  }
}
