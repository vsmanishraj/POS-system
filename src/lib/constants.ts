import { BundleName, FeatureName, UserRole } from "@/types/domain";

export const APP_NAME = "Magroms POS System";

export const ROUTE_ROLE_MAP: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/superadmin", roles: ["SUPER_ADMIN"] },
  { prefix: "/dashboard/admin", roles: ["RESTAURANT_ADMIN", "MANAGER"] },
  { prefix: "/dashboard/pos", roles: ["RESTAURANT_ADMIN", "MANAGER", "CASHIER"] },
  { prefix: "/dashboard/waiter", roles: ["RESTAURANT_ADMIN", "MANAGER", "WAITER"] },
  { prefix: "/dashboard/kitchen", roles: ["RESTAURANT_ADMIN", "MANAGER", "KITCHEN"] },
  { prefix: "/dashboard/inventory", roles: ["RESTAURANT_ADMIN", "MANAGER", "INVENTORY"] }
];

export const BUNDLE_FEATURES: Record<BundleName, FeatureName[]> = {
  Starter: [
    "MENU_MANAGEMENT",
    "PRICE_MANAGEMENT",
    "POS",
    "KDS",
    "WAITER_PANEL",
    "ANALYTICS_BASIC",
    "INVENTORY_AUTOMATION",
    "CRM_SYNC",
    "PRINTER_NETWORK"
  ],
  Pro: [
    "MENU_MANAGEMENT",
    "PRICE_MANAGEMENT",
    "STAFF_MANAGEMENT",
    "POS",
    "KDS",
    "WAITER_PANEL",
    "ANALYTICS_BASIC",
    "ANALYTICS_ADVANCED",
    "CRM_SYNC",
    "PREORDER_SYNC",
    "INVENTORY_AUTOMATION",
    "AUTO_RESTOCK",
    "BRANDING",
    "TAX_CONFIGURATION",
    "AUDIT_LOGS",
    "PRINTER_NETWORK",
    "PRINTER_USB"
  ],
  Enterprise: [
    "MENU_MANAGEMENT",
    "PRICE_MANAGEMENT",
    "STAFF_MANAGEMENT",
    "POS",
    "KDS",
    "WAITER_PANEL",
    "ANALYTICS_BASIC",
    "ANALYTICS_ADVANCED",
    "AI_PREDICTION",
    "AI_UPSELL",
    "CRM_SYNC",
    "PREORDER_SYNC",
    "INVENTORY_AUTOMATION",
    "AUTO_RESTOCK",
    "BRANDING",
    "TAX_CONFIGURATION",
    "AUDIT_LOGS",
    "MFA_ENTERPRISE",
    "DEMO_MODE",
    "PRINTER_NETWORK",
    "PRINTER_USB",
    "PRINTER_BLUETOOTH"
  ]
};
