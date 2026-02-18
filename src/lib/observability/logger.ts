export type LogLevel = "INFO" | "WARN" | "ERROR";

export function logEvent(input: {
  level?: LogLevel;
  event: string;
  requestId?: string;
  actorUserId?: string;
  restaurantId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    ts: new Date().toISOString(),
    level: input.level ?? "INFO",
    event: input.event,
    request_id: input.requestId,
    actor_user_id: input.actorUserId,
    restaurant_id: input.restaurantId,
    metadata: input.metadata ?? {}
  };

  if (payload.level === "ERROR") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (payload.level === "WARN") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}
