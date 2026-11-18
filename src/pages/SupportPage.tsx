import { FormEvent, useEffect, useRef, useState } from "react";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { t } from "../i18n";
import { SUPPORT_WELCOME } from "../lib/supportChat";

export function SupportPage() {
  const msgs = useAppStore((s) => s.supportMessages);
  const busy = useAppStore((s) => s.supportBusy);
  const sendSupportMessage = useAppStore((s) => s.sendSupportMessage);
  const [draft, setDraft] = useState("");
  const [ack, setAck] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const typing = busy && ack;

  useEffect(() => {
    const scroller = threadRef.current?.parentElement;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing]);

  useEffect(() => {
    const el = threadRef.current;
    const scroller = el?.parentElement;
    if (!el || !scroller) return;
    const stick = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!busy) {
      setAck(false);
      return;
    }
    const id = window.setTimeout(() => setAck(true), 380);
    return () => window.clearTimeout(id);
  }, [busy]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    sendSupportMessage(text);
    setDraft("");
  };

  return (
    <StackShell
      header={<StackBar title={t("me.support")} />}
      footer={
        <form className="sup-composer" onSubmit={onSend}>
          <button className="sup-clip press" type="button" aria-label={t("support.attach")}>
            <span className="icon-box" style={{ width: 13, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/clip.svg")} alt="" />
            </span>
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={busy ? t("support.busy") : t("chat.placeholder")}
            disabled={busy}
          />
          <button className="sup-send press" type="submit" aria-label={t("common.send")} disabled={busy}>
            <span className="icon-box" style={{ width: 19, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/send.svg")} alt="" />
            </span>
          </button>
        </form>
      }
    >
      <div className="sup-thread" ref={threadRef}>
        <div className="date-chip">{t("common.today")}</div>
        {msgs.map((m) => (
          <div key={m.id} className={`sup-row ${m.from}`}>
            {m.from === "them" ? (
              <span className="sup-ava">
                <span className="icon-box" style={{ width: 12, height: 11 }}>
                  <img className="icon" src={publicUrl("/icons/headset.svg")} alt="" />
                </span>
              </span>
            ) : null}
            <div className={`sup-bubble ${m.from}`}>
              <p>{m.text === SUPPORT_WELCOME ? t("support.welcome") : m.text}</p>
              <small>{m.time}</small>
            </div>
          </div>
        ))}
        {typing ? (
          <div className="sup-row them" aria-live="polite" aria-label={t("support.typing")}>
            <span className="sup-ava">
              <span className="icon-box" style={{ width: 12, height: 11 }}>
                <img className="icon" src={publicUrl("/icons/headset.svg")} alt="" />
              </span>
            </span>
            <div className="sup-bubble them is-typing">
              <span className="sup-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </StackShell>
  );
}
