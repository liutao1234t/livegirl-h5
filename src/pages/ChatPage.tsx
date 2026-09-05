import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGirl } from "../data/girls";
import { tryDial } from "../lib/paywall";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { useHostsStore } from "../store/hostsStore";
import { publicUrl } from "../lib/publicUrl";

export function ChatPage() {
  const { id = "isabella" } = useParams();
  useHostsStore((s) => s.hosts);
  useAppStore((s) => s.inboxPeople);
  const girl = getGirl(id);
  const navigate = useNavigate();
  const threads = useAppStore((s) => s.threads);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const openOverlay = useAppStore((s) => s.openOverlay);
  const markRead = useAppStore((s) => s.markRead);
  const isVip = useAppStore((s) => s.isVip);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const msgs = threads[id] ?? [];
  const lastFailIndex = msgs.reduce((acc, m, i) => (m.status === "fail" ? i : acc), -1);

  useEffect(() => {
    markRead(id);
  }, [id, msgs.length, markRead]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const stick = () => {
      el.scrollTop = el.scrollHeight;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    if (sendMessage(id, draft)) setDraft("");
  };

  return (
    <StackShell
      header={
        <header className="chat-header">
          <button className="circle-btn press" type="button" aria-label="Back" onClick={() => navigate(-1)}>
            <span className="icon-box" style={{ width: 16, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/back.svg")} alt="" />
            </span>
          </button>
          <div className="chat-person">
            <span className="chat-avatar">
              <img className="avatar" src={girl.avatar} alt="" />
              {girl.online ? (
                <span className="icon-box chat-online" style={{ width: 12, height: 12 }}>
                  <img className="icon" src={publicUrl("/icons/chat-online.svg")} alt="" />
                </span>
              ) : null}
            </span>
            <div>
              <h2>{girl.name}</h2>
              <p>{girl.online ? "Online" : girl.lastActive}</p>
            </div>
          </div>
          <button className="circle-btn press" type="button" aria-label="More" onClick={() => navigate(`/report/${id}`)}>
            <span className="icon-box" style={{ width: 4, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/more.svg")} alt="" />
            </span>
          </button>
        </header>
      }
      footer={
        <>
          <button className="float-call press" type="button" onClick={() => tryDial(girl.id, girl.ratePerMin, navigate)}>
            <span className="icon-box" style={{ width: 20, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/video-chat.svg")} alt="" />
            </span>
            Start Video Call
          </button>
          <form className="composer" onSubmit={onSend}>
            <button className="composer-gift press" type="button" aria-label="Gift" onClick={() => openOverlay("gift", id)}>
              <span className="icon-box" style={{ width: 40, height: 40 }}>
                <img className="icon" src={publicUrl("/images/chat-gift.png")} alt="" />
              </span>
            </button>
            <button className="round press" type="button" aria-label="More">
              <span className="icon-box" style={{ width: 15, height: 15 }}>
                <img className="icon" src={publicUrl("/icons/plus.svg")} alt="" />
              </span>
            </button>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..." />
            <button className="send press" type="submit" aria-label="Send">
              <span className="icon-box" style={{ width: 19, height: 16 }}>
                <img className="icon" src={publicUrl("/icons/send.svg")} alt="" />
              </span>
            </button>
          </form>
        </>
      }
    >
      <div className="messages" ref={scroller}>
        {msgs.length > 0 ? <div className="date-chip">Today</div> : null}
        {msgs.map((m, i) => {
          if (m.kind === "gift" && m.image) {
            return (
              <div key={m.id} className="bubble-row out">
                <div className="bubble gift-msg">
                  <img src={m.image} alt="" />
                </div>
              </div>
            );
          }
          if (m.status === "fail") {
            return (
              <div key={m.id} className="fail-block">
                <div className="bubble-row out">
                  <div className="bubble fail">{m.text}</div>
                  <span className="icon-box" style={{ width: 20, height: 20 }}>
                    <img className="icon" src={publicUrl("/icons/fail.svg")} alt="" />
                  </span>
                </div>
                {i === lastFailIndex && lastFailIndex === msgs.length - 1 && !isVip ? (
                  <div className="fail-vip">
                    <p className="fail-note">
                      Message failed. Only VIP members can
                      <br />
                      send unlimited messages.
                    </p>
                    <button className="vip-btn press" type="button" onClick={() => navigate("/vip")}>
                      Become VIP
                    </button>
                  </div>
                ) : null}
              </div>
            );
          }
          return (
            <div key={m.id} className={`bubble-row ${m.from === "me" ? "out" : "in"}`}>
              {m.from === "them" ? <img className="avatar" src={girl.avatar} alt="" /> : null}
              <div className={`bubble ${m.from === "me" ? "out" : "in"}`}>{m.text}</div>
            </div>
          );
        })}
      </div>
    </StackShell>
  );
}
