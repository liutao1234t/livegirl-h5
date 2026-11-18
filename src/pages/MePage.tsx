import { useNavigate } from "react-router-dom";
import { TabShell } from "../shells/Shells";
import { RATE_REWARD, useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { formatCount, t } from "../i18n";

export function MePage() {
  const navigate = useNavigate();
  const coins = useAppStore((s) => s.coins);
  const following = useAppStore((s) => s.followedIds.length);
  const favorites = useAppStore((s) => s.favorites);
  const dailyTaskDot = useAppStore((s) => s.dailyTaskDot);
  const ratedUs = useAppStore((s) => s.ratedUs);
  const isVip = useAppStore((s) => s.isVip);
  const nickname = useAppStore((s) => s.profile.nickname);
  const userId = useAppStore((s) => s.userId);
  const openOverlay = useAppStore((s) => s.openOverlay);

  return (
    <TabShell
      header={
        <header className="home-header">
          <h1 className="logo" style={{ fontStyle: "normal" }}>
            {t("tab.me")}
          </h1>
          <button className="press" type="button" aria-label={t("me.settings")} onClick={() => navigate("/settings")}>
            <span className="icon-box" style={{ width: 20, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/settings.svg")} alt="" />
            </span>
          </button>
        </header>
      }
    >
      <section className="me-card">
        <img className="me-avatar" src={publicUrl("/images/me-avatar.png")} alt="" />
        <h2>{nickname === "User" ? t("me.user") : nickname}</h2>
        <p>ID: {userId ?? "—"}</p>
        <div className="me-wallet">
          <span>
            <span className="icon-box" style={{ width: 17, height: 15 }}>
              <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
            </span>
            {formatCount(coins)}
          </span>
          <button className="buy-coins press" type="button" onClick={() => navigate("/coins")}>
            {t("me.buyCoins")}
          </button>
        </div>
      </section>

      <div className="me-stats">
        <div>
          <strong>{following}</strong>
          <span>{t("me.following")}</span>
        </div>
        <div>
          <strong>{favorites}</strong>
          <span>{t("me.favorites")}</span>
        </div>
      </div>

      <section className={`me-spotlight ${isVip ? "is-on" : ""}`} aria-label={t("me.vipCenter")}>
        <div className="me-spotlight-head">
          <h3>
            <span className="icon-box" style={{ width: 16.0417, height: 14.25 }}>
              <img className="icon" src={publicUrl("/icons/vip-diamond.svg")} alt="" />
            </span>
            {t("me.vipCenter")}
          </h3>
          <span className="me-spotlight-badge">{isVip ? t("me.active") : t("me.premium")}</span>
        </div>
        <p>{isVip ? t("me.vipOn") : t("me.vipOff")}</p>
        <button className={`me-spotlight-cta press ${isVip ? "is-quiet" : ""}`} type="button" onClick={() => navigate("/vip")}>
          {isVip ? t("me.viewBenefits") : t("me.explore")}
        </button>
      </section>

      <section className={`me-rate ${ratedUs ? "is-done" : ""}`} aria-label={t("me.rateAria")}>
        <div className="me-rate-head">
          <h3>{ratedUs ? t("me.thanksRating") : t("me.enjoying")}</h3>
          <span className="me-rate-stars" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="icon-box" style={{ width: 15, height: 14.25 }}>
                <img className="icon" src={publicUrl("/icons/rate-star.svg")} alt="" />
              </span>
            ))}
          </span>
        </div>
        <div className="me-rate-body">
          <p>
            {t("me.feedback")}
            <small>{ratedUs ? t("me.coinsAdded", { n: RATE_REWARD }) : t("me.coinsReward", { n: RATE_REWARD })}</small>
          </p>
          <button
            className={`me-rate-cta press ${ratedUs ? "is-quiet" : ""}`}
            type="button"
            onClick={() => openOverlay("rateUs")}
          >
            {ratedUs ? t("me.rated") : t("me.rateNow")}
          </button>
        </div>
      </section>

      <div className="me-group">
        <button className="me-row press" type="button" onClick={() => openOverlay("dailyTask")}>
          <span className="me-ico">
            <span className="icon-box" style={{ width: 20, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/task.svg")} alt="" />
            </span>
          </span>
          <span>{t("me.dailyTask")}</span>
          {dailyTaskDot ? <span className="unread-dot inline" /> : null}
          <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
          </span>
        </button>
        <button className="me-row press" type="button" onClick={() => navigate("/support")}>
          <span className="me-ico">
            <span className="icon-box" style={{ width: 20, height: 18 }}>
              <img className="icon" src={publicUrl("/icons/support.svg")} alt="" />
            </span>
          </span>
          <span>{t("me.support")}</span>
          <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
          </span>
        </button>
        <button className="me-row press" type="button" onClick={() => navigate("/apple-support")}>
          <span className="me-ico">
            <span className="icon-box" style={{ width: 24, height: 24 }}>
              <img className="icon" src={publicUrl("/icons/apple.svg")} alt="" />
            </span>
          </span>
          <span>{t("me.apple")}</span>
          <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
          </span>
        </button>
      </div>
    </TabShell>
  );
}
