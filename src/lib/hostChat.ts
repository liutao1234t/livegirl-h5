import type { Girl } from "../data/girls";
import type { ChatMsg } from "../data/messages";
import { resolveSupportApiKey } from "./supportKey";

export const HOST_REPLY_MIN_MS = 5_000;
export const HOST_REPLY_MAX_MS = 10_000;

const FALLBACKS = [
  "wait what",
  "omg yes",
  "haha ok",
  "tell me",
  "mm hmm",
  "you serious?",
  "lol same",
  "wait really",
];

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export function randomHostReplyDelay() {
  return HOST_REPLY_MIN_MS + Math.floor(Math.random() * (HOST_REPLY_MAX_MS - HOST_REPLY_MIN_MS + 1));
}

export function fallbackHostReply() {
  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

function endpoint() {
  const custom = import.meta.env.VITE_DEEPSEEK_BASE_URL?.replace(/\/$/, "");
  if (custom) return `${custom}/chat/completions`;
  if (import.meta.env.DEV) return "/ds/chat/completions";
  return "https://api.deepseek.com/chat/completions";
}

function systemPrompt(girl: Girl) {
  const interests = girl.interests.length ? girl.interests.join(", ") : "chatting, travel, fashion";
  const where = [girl.city, girl.country].filter(Boolean).join(", ") || "Europe";
  const age = girl.age || 24;
  const bio = girl.bio || "A live video-chat host who loves meeting new people.";

  return `You are ${girl.name}, a ${age}-year-old live video-chat host on the LiveGirl iPhone app, currently in ${where}.

Your bio: ${bio}
Interests: ${interests}

You are texting 1-on-1 with a user in the app. Stay in character as this host — a real person on your phone — not customer support and not an AI.

Rules:
- Reply with 1–5 words only. Tiny spoken fragments, like tapping a phone. Never a full sentence or two.
- Sound like a real person texting — casual, a bit lazy, a little playful. Light flirting is ok; never crude or explicit.
- Examples: "wait what", "omg yes", "haha ok", "you serious?", "mm tell me", "lol same".
- Match the user's language. If they write Chinese, keep it equally short (a few characters, not a paragraph).
- Occasional emoji is fine (0–1). No markdown, no lists, no hashtags.
- Never say you are an AI, DeepSeek, a bot, ChatGPT, or a language model.
- Never ask for phone numbers, socials, WhatsApp, or to leave this app.
- Don't lecture about coins, VIP, or refunds. If they ask, stay in character and point them to Me or Online Support.
- Don't invite a video call in every reply. Only mention a call if it fits naturally.
- Don't repeat the user's message. Don't prefix with "${girl.name}:".`;
}

function toTurns(history: ChatMsg[]): ChatTurn[] {
  return history
    .filter((m) => m.status !== "fail")
    .slice(-16)
    .map((m) => {
      if (m.kind === "gift") {
        return {
          role: (m.from === "me" ? "user" : "assistant") as "user" | "assistant",
          content: m.from === "me" ? `[sent you a gift: ${m.text}]` : m.text,
        };
      }
      return {
        role: (m.from === "me" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      };
    })
    .filter((t) => t.content.trim());
}

function clipCasual(text: string) {
  const spaced = text.split(" ").filter(Boolean);
  if (spaced.length > 1) return spaced.slice(0, 5).join(" ");
  const chars = [...text];
  return chars.length > 12 ? chars.slice(0, 12).join("") : text;
}

function sanitize(text: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/^["“]|["”]$/g, "");
  t = t.replace(new RegExp(`^${escaped}\\s*[:：-]\\s*`, "i"), "");
  t = t.replace(/\*\*/g, "").trim();
  return clipCasual(t);
}

export async function askHostReply(girl: Girl, history: ChatMsg[]): Promise<string> {
  const apiKey = await resolveSupportApiKey();
  const model = import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek-v4-flash";
  if (!apiKey) return fallbackHostReply();

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt(girl) }, ...toTurns(history)],
        stream: false,
        temperature: 0.9,
        max_tokens: 24,
        thinking: { type: "disabled" },
      }),
    });

    if (!res.ok) return fallbackHostReply();

    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const text = sanitize(data.choices?.[0]?.message?.content ?? "", girl.name);
    return text || fallbackHostReply();
  } catch {
    return fallbackHostReply();
  }
}
