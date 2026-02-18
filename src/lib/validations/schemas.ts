import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(120),
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  bundleName: z.enum(["Starter", "Pro", "Enterprise"]),
  timezone: z.string().min(2),
  currency: z.string().length(3),
  adminEmail: z.string().email(),
  adminFullName: z.string().min(2),
  featureOverrides: z.record(z.boolean()).optional()
});

export const createOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  table_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  channel: z.enum(["POS", "PREORDER"]),
  priority: z.enum(["NORMAL", "HIGH"]).default("NORMAL"),
  discount_amount: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.number().int().min(1),
        unit_price: z.number().min(0)
      })
    )
    .min(1)
});

export const completeOrderSchema = z.object({
  order_id: z.string().uuid(),
  payment_method: z.enum(["CASH", "CARD", "UPI", "WALLET"]),
  amount_paid: z.number().positive()
});

export const featureToggleSchema = z.object({
  restaurant_id: z.string().uuid(),
  feature_name: z.string().min(2),
  is_enabled: z.boolean()
});
