import { useEffect, useState, type AnimationEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { getGirl } from "../data/girls";
import { formatCallRate, tryDial, useCallRate } from "../lib/paywall";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { noteProfileView } from "../store/incomingCallStore";
import { publicUrl } from "../lib/publicUrl";
import { formatLastActive, hostCopy, hostPlace, t } from "../i18n";

export function ProfilePage() {
  const { id = "isabella" } = useParams();
  const girl = getGirl(id);
  const navigate = useNavigate();
  const followed = useAppStore((s) => s.followedIds.includes(girl.id));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const callRate = useCallRate(girl.ratePerMin);
  const [preview, setPreview] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    noteProfileView(id);
  }, [id]);

  useEffect(() => {
    if (preview) {
      setShown(preview);
      setPhase("in");
      return;
    }
    setPhase("out");
  }, [preview]);

  useEffect(() => {
    if (phase !== "out" || !shown) return;
    const t = window.setTimeout(() => setShown(null), 280);
    return () => window.clearTimeout(t);
  }, [phase, shown]);

  const onViewerEnd = (e: AnimationEvent<HTMLButtonElement>) => {
    if (e.target !== e.currentTarget) return;
    if (phase !== "out") return;
    if (e.animationName !== "moment-viewer-out") return;
    setShown(null);
  };

  const host = typeof document !== "undefined" ? document.querySelector(".app-root") : null;

  return (
    <StackShell>
      <div className="profile-hero">
        <img className="cover" src={girl.id === "isabella" ? publicUrl("/images/profile-hero.png") : girl.photo} alt="" />
        <div className="shade-top" />
        <div className="shade" />
        <div className="profile-nav">
          <button className="circle-btn press" type="button" aria-label={t("common.back")} onClick={() => navigate(-1)}>
            <span className="icon-box" style={{ width: 16, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/back.svg")} alt="" />
            </span>
          </button>
          <button className="circle-btn press" type="button" aria-label={t("common.more")} onClick={() => navigate(`/report/${girl.id}`)}>
            <span className="icon-box" style={{ width: 4, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/more.svg")} alt="" />
            </span>
          </button>
        </div>
        <div className="info">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1>
                {girl.name}, {girl.age}
              </h1>
              <p className="loc">
                <span className="icon-box" style={{ width: 12, height: 15 }}>
                  <img className="icon" src={publicUrl("/icons/pin.svg")} alt="" />
                </span>
                {hostPlace(girl)}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              {girl.online ? (
                <div className="status-pill" style={{ position: "relative", top: 0, right: 0, display: "inline-flex" }}>
                  <span className="dot" style={{ background: "var(--online-cyan)" }} />
                  {t("common.online")}
                </div>
              ) : null}
              <p style={{ margin: "8px 0 0", color: "#3fe5ff", fontSize: 12 }}>{formatLastActive(girl.lastActive)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn-primary press" type="button" onClick={() => tryDial(girl.id, girl.ratePerMin, navigate)}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="icon-box" style={{ width: 20, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/video-chat.svg")} alt="" />
            </span>
            {t("profile.call")}
          </span>
          <small>
            <span className="icon-box" style={{ width: 15, height: 13 }}>
              <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
            </span>
            {formatCallRate(callRate)}
          </small>
        </button>
        <button className="side-btn press" type="button" aria-label={t("profile.message")} onClick={() => navigate(`/chat/${girl.id}`)}>
          <span className="icon-box" style={{ width: 20, height: 20 }}>
            <img className="icon" src={publicUrl("/icons/heart.svg")} alt="" />
          </span>
        </button>
        <button
          className={`side-btn press ${followed ? "is-followed" : ""}`}
          type="button"
          aria-label={followed ? t("me.following") : t("profile.follow")}
          aria-pressed={followed}
          onClick={() => toggleFollow(girl.id)}
        >
          <span className="icon-box" style={{ width: 22, height: 16 }}>
            <img className="icon" src={followed ? publicUrl("/icons/follow-check.svg") : publicUrl("/icons/message.svg")} alt="" />
          </span>
        </button>
      </div>

      <section className="panel">
        <h3>{t("profile.about")}</h3>
        <p>{hostCopy(girl.bio)}</p>
      </section>

      <h3 className="section-title" style={{ fontSize: 12, letterSpacing: "0.6px", color: "var(--accent)", fontWeight: 600 }}>
        {t("profile.interests")}
      </h3>
      <div className="tags">
        {girl.interests.map((tag) => (
          <span key={tag} className="tag">
            {hostCopy(tag)}
          </span>
        ))}
      </div>

      <section className="panel">
        <h3 style={{ fontSize: 14 }}>{t("profile.verify")}</h3>
        <div className="verify-grid">
          {[
            ["Facebook", publicUrl("/icons/verify-fb.svg"), "#2563eb"],
            ["Twitter", publicUrl("/icons/verify-x.svg"), "#60a5fa"],
            [t("profile.phone"), publicUrl("/icons/verify-phone.svg"), "#9333ea"],
            [t("profile.photo"), publicUrl("/icons/verify-photo.svg"), "#ec4899"],
          ].map(([label, src, bg]) => (
            <div key={label} className="verify-item">
              <span className="badge" style={{ background: bg }}>
                <img src={src} alt="" />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      <h2 className="section-title">{t("profile.moments")}</h2>
      <div className="moments">
        {girl.moments.map((src, i) => (
          <button
            key={`${src}-${i}`}
            className="moment-tile press"
            type="button"
            aria-label={t("profile.viewPhoto")}
            onClick={() => setPreview(src)}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
      {shown && host
        ? createPortal(
            <button
              type="button"
              className={`moment-viewer ${phase === "out" ? "is-out" : "is-in"}`}
              aria-label={t("profile.closePhoto")}
              onClick={() => (phase === "out" ? undefined : setPreview(null))}
              onAnimationEnd={onViewerEnd}
            >
              <img src={shown} alt="" />
            </button>,
            host,
          )
        : null}
    </StackShell>
  );
}
