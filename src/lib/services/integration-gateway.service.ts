import { syncItemAvailability, syncOrderStatus } from "@/lib/integrations/preorder";
import { upsertCustomerVisit } from "@/lib/integrations/crm";

export async function syncAcrossChannels(input: {
  restaurantId: string;
  orderId: string;
  orderStatus: string;
  customerEmail: string;
  spendAmount: number;
}) {
  const [preorderResult, itemSyncResult, crmResult] = await Promise.all([
    syncOrderStatus(input.orderId, input.orderStatus),
    syncItemAvailability(input.restaurantId),
    upsertCustomerVisit({
      restaurantId: input.restaurantId,
      customerEmail: input.customerEmail,
      spendAmount: input.spendAmount
    })
  ]);

  return {
    preorderResult,
    itemSyncResult,
    crmResult
  };
}
