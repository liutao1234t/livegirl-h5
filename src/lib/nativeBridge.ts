type NativeHandler = {
  postMessage: (message: unknown) => void;
};

function messageHandlers() {
  return (
    window as Window & {
      webkit?: { messageHandlers?: Record<string, NativeHandler> };
    }
  ).webkit?.messageHandlers;
}

/** Single WKWebView JS Bridge. Missing handlers fail closed. */
export function postToNative(name: string, payload: unknown): boolean {
  const handler = messageHandlers()?.[name];
  if (!handler || typeof handler.postMessage !== "function") return false;
  try {
    handler.postMessage(payload);
    return true;
  } catch {
    return false;
  }
}
