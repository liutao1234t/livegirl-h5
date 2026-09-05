import type { NavigationType } from "react-router-dom";

export type ShellKind = "tab" | "stack" | "full";
export type NavAnim =
  | "push"
  | "pop"
  | "fade-in"
  | "fade-out"
  | "slide-in-right"
  | "slide-out-right"
  | "hangup"
  | "none";

export const HANGUP_EXIT_MS = 500;

export function shellKind(pathname: string): ShellKind {
  if (pathname === "/" || pathname.startsWith("/call/")) return "full";
  if (pathname.startsWith("/app/")) return "tab";
  return "stack";
}

function isRingingCall(pathname: string) {
  return pathname.startsWith("/call/incoming/") || pathname.startsWith("/call/outgoing/");
}

function isInCall(pathname: string) {
  return pathname.startsWith("/call/in/");
}

export function isHangupExitState(state: unknown) {
  return Boolean(state && typeof state === "object" && "hangupExit" in state && (state as { hangupExit?: unknown }).hangupExit === true);
}

function stackDepth(pathname: string) {
  if (pathname.startsWith("/settings/") || pathname.startsWith("/report/") || pathname.startsWith("/legal")) return 2;
  return 1;
}

export function decideNavAnim(
  fromPath: string,
  toPath: string,
  navType: NavigationType,
  reduceMotion: boolean,
  toState?: unknown,
): NavAnim {
  if (reduceMotion || fromPath === toPath) return "none";
  const from = shellKind(fromPath);
  const to = shellKind(toPath);

  if (from === "tab" && to === "tab") return "none";
  if (from === "full" && to === "full") return "none";

  if (isRingingCall(toPath)) return "slide-in-right";
  if (isRingingCall(fromPath)) return "slide-out-right";

  if (isInCall(fromPath) && isHangupExitState(toState)) return "hangup";

  if (from === "full") return "fade-out";
  if (to === "full") return "fade-in";

  if (from === "tab" && to === "stack") return "push";
  if (from === "stack" && to === "tab") return "pop";

  if (from === "stack" && to === "stack") {
    if (navType === "POP") return "pop";
    if (navType === "REPLACE") return "none";
    if (stackDepth(toPath) < stackDepth(fromPath)) return "pop";
    return "push";
  }

  return "none";
}
