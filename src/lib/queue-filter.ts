export type QueueFilter = "all" | "solo" | "flex";

export const QUEUE_SOLO = 420;
export const QUEUE_FLEX = 440;

export const QUEUE_FILTER_LABEL: Record<QueueFilter, string> = {
  all: "All",
  solo: "Solo/Duo",
  flex: "Flex",
};

export function matchesQueueFilter(queueId: number, filter: QueueFilter): boolean {
  if (filter === "all") return true;
  return queueId === (filter === "solo" ? QUEUE_SOLO : QUEUE_FLEX);
}

export function filterByQueue<T extends { queueId: number }>(matches: T[], filter: QueueFilter): T[] {
  return filter === "all" ? matches : matches.filter((m) => matchesQueueFilter(m.queueId, filter));
}

/** Short queue name for compact rows. */
export function shortQueueName(queueId: number): string {
  if (queueId === QUEUE_SOLO) return "Solo/Duo";
  if (queueId === QUEUE_FLEX) return "Flex";
  return "Other";
}
