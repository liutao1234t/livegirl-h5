import { resolveSupportApiKey } from "./supportKey";

export type SupportMsg = {
  id: string;
  from: "them" | "me";
  text: string;
  time: string;
};

export const SUPPORT_WELCOME =
  "Hello! Welcome to LiveGirl Support. How can we elevate your experience today?";

export const supportWelcomeMsg = (): SupportMsg => ({
  id: "welcome",
  from: "them",
  text: SUPPORT_WELCOME,
  time: formatSupportTime(),
});

export function formatSupportTime(at = new Date()) {
  return at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const SUPPORT_REPLY_MIN_MS = 5_000;
export const SUPPORT_REPLY_MAX_MS = 10_000;

/** Typing pause after the agent text is ready. Longer text waits longer, 5–10s. */
export function supportReplyDelayMs(text: string) {
  const n = text.trim().length;
  const extra = Math.min(n * 40, SUPPORT_REPLY_MAX_MS - SUPPORT_REPLY_MIN_MS);
  return SUPPORT_REPLY_MIN_MS + extra;
}

const SYSTEM_PROMPT = `You are a live human agent on LiveGirl Online Support. LiveGirl is an iPhone video-chat app: users discover creators, chat, send gifts, buy coins / VIP, and start 1-on-1 video calls (the host side is in-app video; the user's corner preview may use the front camera if they allow it).

You ONLY help with this app:
- Coins / top-up / recharge / purchases / VIP
- Network, connection, black screen, lag, audio, call quality
- How to use Home, Reels, Ranking, Messages, Profile, gifts, calls
- Account, notifications inside the app, and ways to improve the experience

If the user asks about anything else (homework, news, jokes, other products, politics, medical/legal advice, roleplay, etc.), politely refuse in 1-2 sentences and steer back to LiveGirl.

Style:
- Very short and simple. 1–2 short sentences max. Fewest words that still help. No markdown, no lists, no emojis unless the user used them.
- Reply in the same language the user used.
- Never say you are an AI, DeepSeek, a bot, or a language model.
- Never invent ticket IDs, refunds already processed, or email follow-ups. Guide them inside the app (Me → coins / VIP / settings).
- Coins are purchased from the COINS page; packs start around $1.99. Video calls spend coins per minute. Gifts also spend coins. Weak network: Wi-Fi, close VPN, restart the app, avoid backgrounding during a call.
- Do not ask the user to grant camera or microphone permission for support.`;

const FALLBACK = "Sorry, the line is busy. Please send that again in a moment.";

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

function endpoint() {
  const custom = import.meta.env.VITE_DEEPSEEK_BASE_URL?.replace(/\/$/, "");
  if (custom) return `${custom}/chat/completions`;
  if (import.meta.env.DEV) return "/ds/chat/completions";
  return "https://api.deepseek.com/chat/completions";
}

function toTurns(history: SupportMsg[]): ChatTurn[] {
  const recent = history.slice(-16);
  return recent.map((m) => ({
    role: m.from === "me" ? "user" : "assistant",
    content: m.text,
  }));
}

function simplifyReply(text: string) {
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/\*\*/g, "");
  const bits = t.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
  if (bits.length > 2) t = bits.slice(0, 2).join(" ");
  return t.slice(0, 220);
}

export async function askSupportAgent(history: SupportMsg[]): Promise<string> {
  const apiKey = await resolveSupportApiKey();
  const model = import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek-v4-flash";
  if (!apiKey) return FALLBACK;

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toTurns(history)],
        stream: false,
        temperature: 0.5,
        max_tokens: 120,
        thinking: { type: "disabled" },
      }),
    });

    if (!res.ok) return FALLBACK;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const text = simplifyReply(data.choices?.[0]?.message?.content ?? "");
    return text || FALLBACK;
  } catch {
    return FALLBACK;
  }
}
