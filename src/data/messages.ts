export type ChatMsg = {
  id: string;
  from: "them" | "me";
  text: string;
  at?: number;
  status?: "ok" | "fail";
  kind?: "text" | "gift";
  image?: string;
};

export function formatInboxTime(at: number) {
  const diff = Math.max(0, Date.now() - at);
  if (diff < 45_000) return "Just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`;
  const days = Math.round(diff / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) {
    return new Date(at).toLocaleDateString("en-US", { weekday: "short" });
  }
  return new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
