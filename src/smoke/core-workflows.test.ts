import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockClaims = {
  sub: "user-1",
  role: "SUPER_ADMIN",
  restaurant_id: "11111111-1111-1111-1111-111111111111",
  email: "admin@magroms.app"
};

vi.mock("@/lib/auth/guards", () => ({
  requireRoles: vi.fn(async () => ({ ok: true, claims: mockClaims }))
}));

vi.mock("@/lib/services/provisioning.service", () => ({
  provisionRestaurant: vi.fn(async () => ({ restaurantId: "resto-1", adminUserId: "u-1" }))
}));

vi.mock("@/lib/services/order.service", () => ({
  createOrder: vi.fn(async () => ({ id: "ord-1", order_number: "ORD-1", total_amount: 25 })),
  sendToKitchen: vi.fn(async () => ({ id: "ord-1", order_number: "ORD-1", status: "KITCHEN" })),
  completeOrder: vi.fn(async () => ({ order: { id: "ord-1", status: "COMPLETED" }, inventoryResult: { updatedItems: 2 } })),
  listKitchenQueue: vi.fn(async () => []),
  listRecentOrders: vi.fn(async () => []),
  listTableOrders: vi.fn(async () => []),
  updateOrderPriority: vi.fn(async () => ({ id: "ord-1", priority: "HIGH" })),
  updateOrderStatus: vi.fn(async () => ({ id: "ord-1", status: "READY" }))
}));

vi.mock("@/lib/services/admin-config.service", () => ({
  updateTable: vi.fn(async () => ({ id: "table-1", current_status: "BILL_REQUESTED" }))
}));

vi.mock("@/lib/analytics/reports", () => ({
  getSalesReport: vi.fn(async () => ({ totalSales: 1000, orders: 10, posSales: 700, preorderSales: 300 })),
  getBestSellingItems: vi.fn(async () => [{ item_name: "Pizza", quantity_sold: 50 }]),
  getPeakHours: vi.fn(async () => [{ hour: 19, order_count: 8 }]),
  getInventoryTurnover: vi.fn(async () => ({ periodDays: 30, totalUsage: 400, avgStock: 200, turnover: 2 })),
  getSalesSplit: vi.fn(() => ({ posPercentage: 70, preorderPercentage: 30 })),
  getStockSuggestions: vi.fn(async () => [{ name: "Tomatoes", currentStock: 2, reorderPoint: 6, suggestedQty: 5 }])
}));

vi.mock("@/lib/services/feature-flags.service", () => ({
  hasFeature: vi.fn(async (_restaurantId: string, featureName: string) =>
    ["AI_PREDICTION", "AI_UPSELL", "ANALYTICS_ADVANCED"].includes(featureName)
  )
}));

import { POST as provisionPost } from "@/app/api/automation/provision/route";
import { POST as waiterActionPost } from "@/app/api/waiter/table-action/route";
import { POST as ordersPost, PATCH as ordersPatch } from "@/app/api/orders/route";
import { GET as analyticsGet } from "@/app/api/analytics/reports/route";

describe("core route smoke workflows", () => {
  beforeEach(() => {
    mockClaims.role = "SUPER_ADMIN";
    mockClaims.restaurant_id = "11111111-1111-1111-1111-111111111111";
  });

  it("provisions restaurant with standard response envelope", async () => {
    const req = new NextRequest("http://localhost/api/automation/provision", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-provision-1" },
      body: JSON.stringify({
        name: "Green Bowl",
        subdomain: "green-bowl",
        bundleName: "Pro",
        timezone: "America/New_York",
        currency: "USD",
        adminEmail: "owner@greenbowl.com",
        adminFullName: "Owner Name"
      })
    });

    const res = await provisionPost(req);
    const json = (await res.json()) as { success: boolean; meta?: { request_id?: string } };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.meta?.request_id).toBe("req-provision-1");
    expect(res.headers.get("x-request-id")).toBe("req-provision-1");
  });

  it("creates and updates order lifecycle", async () => {
    mockClaims.role = "RESTAURANT_ADMIN";

    const createReq = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        restaurant_id: mockClaims.restaurant_id,
        channel: "POS",
        priority: "NORMAL",
        discount_amount: 0,
        items: [{ menu_item_id: "22222222-2222-2222-2222-222222222222", quantity: 1, unit_price: 25 }]
      })
    });

    const createRes = await ordersPost(createReq);
    const createJson = (await createRes.json()) as { success: boolean };
    expect(createRes.status).toBe(200);
    expect(createJson.success).toBe(true);

    const patchReq = new NextRequest("http://localhost/api/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "SET_STATUS",
        restaurant_id: mockClaims.restaurant_id,
        order_id: "33333333-3333-3333-3333-333333333333",
        status: "READY"
      })
    });

    const patchRes = await ordersPatch(patchReq);
    const patchJson = (await patchRes.json()) as { success: boolean };
    expect(patchRes.status).toBe(200);
    expect(patchJson.success).toBe(true);
  });

  it("handles waiter table action", async () => {
    mockClaims.role = "WAITER";

    const req = new NextRequest("http://localhost/api/waiter/table-action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        table_id: "44444444-4444-4444-4444-444444444444",
        action: "REQUEST_BILL"
      })
    });

    const res = await waiterActionPost(req);
    const json = (await res.json()) as { success: boolean };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns advanced analytics payload", async () => {
    mockClaims.role = "RESTAURANT_ADMIN";

    const req = new NextRequest(
      `http://localhost/api/analytics/reports?restaurant_id=${encodeURIComponent(String(mockClaims.restaurant_id))}`,
      { method: "GET" }
    );

    const res = await analyticsGet(req);
    const json = (await res.json()) as {
      success: boolean;
      data?: { split?: { posPercentage: number }; inventoryTurnover?: { turnover: number }; upsell?: string[] };
    };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.split?.posPercentage).toBe(70);
    expect(json.data?.inventoryTurnover?.turnover).toBe(2);
    expect(Array.isArray(json.data?.upsell)).toBe(true);
  });
});
