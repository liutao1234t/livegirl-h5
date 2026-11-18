export type ChatMsg = {
  id: string;
  from: "them" | "me";
  text: string;
  at?: number;
  status?: "ok" | "fail";
  kind?: "text" | "gift";
  image?: string;
};

export { formatInboxTime } from "../i18n";
