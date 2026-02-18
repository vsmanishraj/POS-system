export type UserRole =
  | "SUPER_ADMIN"
  | "RESTAURANT_ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "WAITER"
  | "KITCHEN"
  | "INVENTORY"
  | "CUSTOMER";

export type BundleName = "Starter" | "Pro" | "Enterprise";

export type FeatureName =
  | "MENU_MANAGEMENT"
  | "PRICE_MANAGEMENT"
  | "STAFF_MANAGEMENT"
  | "ANALYTICS_BASIC"
  | "ANALYTICS_ADVANCED"
  | "AI_PREDICTION"
  | "AI_UPSELL"
  | "CRM_SYNC"
  | "PREORDER_SYNC"
  | "INVENTORY_AUTOMATION"
  | "AUTO_RESTOCK"
  | "KDS"
  | "POS"
  | "WAITER_PANEL"
  | "MFA_ENTERPRISE"
  | "BRANDING"
  | "TAX_CONFIGURATION"
  | "AUDIT_LOGS"
  | "DEMO_MODE"
  | "PRINTER_USB"
  | "PRINTER_BLUETOOTH"
  | "PRINTER_NETWORK";

export type RestaurantStatus = "ACTIVE" | "SUSPENDED" | "PENDING_SETUP";

export interface AuthClaims {
  sub: string;
  role: UserRole;
  restaurant_id: string | null;
  email: string;
}

export interface RestaurantProvisionPayload {
  name: string;
  subdomain: string;
  bundleName: BundleName;
  timezone: string;
  currency: string;
  adminEmail: string;
  adminFullName: string;
  featureOverrides?: Partial<Record<FeatureName, boolean>>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    request_id: string;
    code?: string;
  };
}
