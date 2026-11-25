import { LazyContent } from "./LazyContent";
import { lazy, useEffect, useState, type AnimationEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getGirl } from "../data/girls";
import { newbieIap, reward3Iap } from "../data/iap";
import { gifts } from "../data/shop";
import { appStoreReviewUrl } from "../lib/nativeShare";
import { openCoinShop } from "../lib/paywall";
import { CoinPackGrid } from "../pages/CoinPacks";
import {
  CHECKIN_BONUS,
  CHECKIN_REWARD,
  RATE_REWARD,
  formatCallClock,
  resolveCheckIn,
  todayKey,
  useAppStore,
  type OverlayId,
} from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { formatCount, giftLabel, locale, t } from "../i18n";

const LiveHubUnlock = lazy(() => import("../pages/LiveHubPage").then((m) => ({ default: m.LiveHubUnlock })));

const NEW_MSG_HOLD_MS = 3000;
const ACCOUNT_RESET_MS = 2000;

export function OverlayHost() {
  const overlay = useAppStore((s) => s.overlay);
  const overlayGirlId = useAppStore((s) => s.overlayGirlId);
  const payBusy = useAppStore((s) => s.payBusy);
  const close = useAppStore((s) => s.closeOverlay);
  const navigate = useNavigate();
  const [shown, setShown] = useState<Exclude<OverlayId, null> | null>(overlay);
  const [phase, setPhase] = useState<"in" | "out">("in");

  const runAccountReset = (mode: "logout" | "delete") => {
    if (useAppStore.getState().payBusy) return;
    useAppStore.setState({ payBusy: true });
    window.setTimeout(() => {
      useAppStore.getState().resetAccount(mode);
      navigate("/", { replace: true });
    }, ACCOUNT_RESET_MS);
  };

  useEffect(() => {
    if (overlay) {
      setShown(overlay);
      setPhase("in");
      return;
    }
    setPhase("out");
  }, [overlay]);

  useEffect(() => {
    if (phase !== "out" || !shown) return;
    const ms = shown === "livehub" ? 0 : shown === "gift" || shown === "coins" ? 280 : shown === "newMsg" ? 220 : 400;
    const t = window.setTimeout(() => setShown(null), ms);
    return () => window.clearTimeout(t);
  }, [phase, shown]);

  useEffect(() => {
    if (shown !== "newMsg" || phase !== "in") return;
    let hold = 0;
    const start = window.setTimeout(() => {
      hold = window.setTimeout(() => {
        if (useAppStore.getState().overlay === "newMsg") close();
      }, NEW_MSG_HOLD_MS);
    }, 340);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(hold);
    };
  }, [shown, phase, overlayGirlId, close]);

  const onStageEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (phase !== "out") return;
    if (
      e.animationName !== "overlay-pop-out" &&
      e.animationName !== "overlay-sheet-out" &&
      e.animationName !== "overlay-banner-out"
    ) {
      return;
    }
    setShown(null);
  };

  const leaving = phase === "out";
  const isSheet = shown === "gift" || shown === "coins";
  const isBanner = shown === "newMsg";
  const isLiveHub = shown === "livehub";
  const isReward3 = shown === "reward3";

  return (
    <>
      {!shown ? (
        <div className="overlay-root" />
      ) : (
    <div className={`overlay-root${isBanner ? " is-toast" : " is-open"}${isSheet ? " is-sheet" : ""}${isReward3 ? " is-reward3" : ""}${leaving ? " is-leaving" : ""}`}>
      {isLiveHub ? <LazyContent><LiveHubUnlock /></LazyContent> : null}
      {isBanner || isLiveHub ? null : <button className="overlay-mask" aria-label={t("common.close")} onClick={leaving ? undefined : close} />}
      {isLiveHub ? null : isSheet ? (
        <div className={`overlay-sheet ${leaving ? "is-out" : "is-in"}`} onAnimationEnd={onStageEnd}>
          {shown === "gift" ? <GiftSheet /> : null}
          {shown === "coins" ? <CoinsSheet /> : null}
        </div>
      ) : (
        <div
          key={isBanner ? overlayGirlId ?? "newmsg" : shown}
          className={`overlay-pop${isBanner ? " is-banner" : ""} ${leaving ? "is-out" : "is-in"}`}
          onAnimationEnd={onStageEnd}
        >
          {shown === "unlock" ? <UnlockCard /> : null}
          {shown === "endCall" ? <EndCallCard /> : null}
          {shown === "dailyTask" ? <TaskCard /> : null}
          {shown === "rateUs" ? <RateCard /> : null}
          {shown === "welcome" ? <WelcomeCard /> : null}
          {shown === "reward3" ? <Reward3Card /> : null}
          {shown === "promo" ? <PromoCard /> : null}
          {shown === "newMsg" ? <NewMsgCard /> : null}
          {shown === "insufficient" ? (
            <CenterCard title={t("overlay.notEnough")} copy={t("overlay.topUp")} cta={t("coins.get")} onCta={() => openCoinShop(navigate)} />
          ) : null}
          {shown === "confirmLogout" ? (
            <CenterCard
              title={t("settings.logout")}
              copy={t("overlay.logoutCopy")}
              cta={t("settings.logout")}
              danger
              onCta={() => runAccountReset("logout")}
            />
          ) : null}
          {shown === "confirmDelete" ? (
            <CenterCard
              title={t("settings.delete")}
              copy={t("overlay.deleteCopy")}
              cta={t("overlay.deleteCta")}
              danger
              onCta={() => runAccountReset("delete")}
            />
          ) : null}
        </div>
      )}
    </div>
      )}
      {payBusy ? <BusyLoading /> : null}
      <ToastHost />
      <GiftFxHost />
    </>
  );
}

function BusyLoading() {
  return (
    <div className="overlay-root is-open is-pay" role="alertdialog" aria-busy="true" aria-label={t("common.loading")}>
      <div className="pay-loading">
        <span className="pay-spinner" />
      </div>
    </div>
  );
}

function ToastHost() {
  const toast = useAppStore((s) => s.toast);
  const [shown, setShown] = useState(toast);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (toast) {
      setShown(toast);
      setPhase("in");
      return;
    }
    setPhase("out");
  }, [toast]);

  useEffect(() => {
    if (phase !== "out" || !shown) return;
    const t = window.setTimeout(() => setShown(null), 220);
    return () => window.clearTimeout(t);
  }, [phase, shown]);

  if (!shown) return null;

  return (
    <div className="overlay-root is-toast is-app-toast">
      <p className={`app-toast ${phase === "out" ? "is-out" : "is-in"}`} role="status">
        {shown}
      </p>
    </div>
  );
}

function GiftFxHost() {
  const giftFx = useAppStore((s) => s.giftFx);
  const clearGiftFx = useAppStore((s) => s.clearGiftFx);

  useEffect(() => {
    if (!giftFx) return;
    const t = window.setTimeout(() => {
      if (useAppStore.getState().giftFx?.token === giftFx.token) clearGiftFx();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [giftFx, clearGiftFx]);

  if (!giftFx) return null;

  return (
    <div className="overlay-root is-gift-fx" aria-hidden>
      <div key={giftFx.token} className="gift-fx">
        <img src={giftFx.icon} alt="" />
      </div>
    </div>
  );
}

function NewMsgCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const overlayGirlId = useAppStore((s) => s.overlayGirlId);
  const threads = useAppStore((s) => s.threads);
  const navigate = useNavigate();
  const girlId = overlayGirlId ?? "";
  const girl = getGirl(girlId);
  const last = [...(threads[girlId] ?? [])].reverse().find((m) => m.from === "them");
  const preview = last?.text ? `${girl.name}: ${last.text}` : t("messages.tapChat");

  if (!girlId) return null;

  return (
    <button
      className="overlay-card is-newmsg press"
      type="button"
      aria-labelledby="newmsg-title"
      onClick={() => {
        close();
        navigate(`/chat/${girlId}`);
      }}
    >
      <span className="newmsg-ico">
        <span className="icon-box" style={{ width: 17, height: 17 }}>
          <img className="icon" src={publicUrl("/icons/new-msg.svg")} alt="" />
        </span>
      </span>
      <span className="newmsg-body">
        <span className="newmsg-top">
          <span className="newmsg-app">Lounge</span>
          <time className="newmsg-time">{t("common.now")}</time>
        </span>
        <strong id="newmsg-title" className="newmsg-title">
          {t("messages.new")}
        </strong>
        <span className="newmsg-preview">{preview}</span>
      </span>
    </button>
  );
}

function CenterCard({
  title,
  copy,
  cta = t("common.close"),
  danger,
  onCta,
}: {
  title: string;
  copy: string;
  cta?: string;
  danger?: boolean;
  onCta?: () => void;
}) {
  const close = useAppStore((s) => s.closeOverlay);
  return (
    <div className="overlay-card" role="dialog">
      <h2>{title}</h2>
      <p>{copy}</p>
      <button
        className={`btn-primary press ${danger ? "is-danger" : ""}`}
        style={{ marginTop: 16 }}
        type="button"
        onClick={() => {
          const before = useAppStore.getState().overlay;
          onCta?.();
          const after = useAppStore.getState().overlay;
          if (after && after !== before) return;
          close();
        }}
      >
        {cta}
      </button>
    </div>
  );
}

function GiftSheet() {
  const close = useAppStore((s) => s.closeOverlay);
  const sendGift = useAppStore((s) => s.sendGift);
  const overlayGirlId = useAppStore((s) => s.overlayGirlId);
  const coins = useAppStore((s) => s.coins);
  const navigate = useNavigate();
  const [pick, setPick] = useState(gifts[3].id);
  const selected = gifts.find((g) => g.id === pick) ?? gifts[0];

  return (
    <div className="sheet" role="dialog" aria-label={t("gift.aria")}>
      <header className="sheet-head">
        <h2>{t("gift.aria")}</h2>
        <span className="sheet-coins">
          <img src={publicUrl("/images/coin.png")} alt="" />
          {formatCount(coins)}
          <button
            className="sheet-plus press"
            type="button"
            aria-label={t("coins.get")}
            onClick={() => openCoinShop(navigate)}
          >
            <span className="icon-box" style={{ width: 10, height: 10 }}>
              <img className="icon" src={publicUrl("/icons/sheet-plus.svg")} alt="" />
            </span>
          </button>
        </span>
        <button className="sheet-x press" type="button" aria-label={t("common.close")} onClick={close}>
          <span className="icon-box" style={{ width: 14, height: 14 }}>
            <img className="icon" src={publicUrl("/icons/sheet-close.svg")} alt="" />
          </span>
        </button>
      </header>
      <div className="gift-grid">
        {gifts.map((g) => (
          <button
            key={g.id}
            className={`gift-cell press ${pick === g.id ? "is-on" : ""} ${g.gold ? "gold" : ""}`}
            type="button"
            onClick={() => setPick(g.id)}
          >
            {pick === g.id ? (
              <span className="gift-check">
                <span className="icon-box" style={{ width: 8, height: 6 }}>
                  <img className="icon" src={publicUrl("/icons/sheet-check.svg")} alt="" />
                </span>
              </span>
            ) : null}
            <span className="gift-ico">
              <img src={g.icon} alt="" />
            </span>
            <strong>{giftLabel(g.id)}</strong>
            <small>
              <img src={publicUrl("/images/coin.png")} alt="" />
              {g.cost}
            </small>
          </button>
        ))}
      </div>
      <button
        className="sheet-send press"
        type="button"
        onClick={() => {
          if (!overlayGirlId) return;
          if (sendGift(overlayGirlId, selected.id)) close();
        }}
      >
        {t("gift.send")}
        <span className="icon-box" style={{ width: 16, height: 13 }}>
          <img className="icon" src={publicUrl("/icons/sheet-send.svg")} alt="" />
        </span>
      </button>
    </div>
  );
}

function CoinsSheet() {
  const close = useAppStore((s) => s.closeOverlay);
  const coins = useAppStore((s) => s.coins);

  return (
    <div className="sheet is-coins" role="dialog" aria-label={t("coins.aria")}>
      <header className="sheet-head">
        <h2>{t("coins.word")}</h2>
        <span className="sheet-coins">
          <img src={publicUrl("/images/coin.png")} alt="" />
          {formatCount(coins)}
        </span>
        <button className="sheet-x press" type="button" aria-label={t("common.close")} onClick={close}>
          <span className="icon-box" style={{ width: 14, height: 14 }}>
            <img className="icon" src={publicUrl("/icons/sheet-close.svg")} alt="" />
          </span>
        </button>
      </header>
      <p className="coins-lead">
        {t("coins.lead1")}
        <br />
        {t("coins.lead2")}
      </p>
      <CoinPackGrid />
    </div>
  );
}

function UnlockCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const navigate = useNavigate();
  return (
    <div className="overlay-card is-unlock" role="dialog" aria-labelledby="unlock-title">
      <div className="unlock-badge">
        <span className="icon-box" style={{ width: 21, height: 28 }}>
          <img className="icon" src={publicUrl("/icons/unlock-vip.svg")} alt="" />
        </span>
      </div>
      <div className="unlock-copy">
        <h2 id="unlock-title">{t("overlay.vipRequired")}</h2>
        <p>{t("overlay.vipCopy")}</p>
      </div>
      <div className="unlock-actions">
        <button
          className="unlock-cta press"
          type="button"
          onClick={() => {
            close();
            navigate("/vip");
          }}
        >
          {t("chat.become")}
        </button>
        <button className="overlay-later press" type="button" onClick={close}>
          {t("overlay.later")}
        </button>
      </div>
      <p className="unlock-price">{t("overlay.only")}</p>
    </div>
  );
}

function EndCallCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const overlayGirlId = useAppStore((s) => s.overlayGirlId);
  const lastCall = useAppStore((s) => s.lastCall);
  const girl = getGirl(lastCall?.girlId ?? overlayGirlId ?? "isabella");
  const [vote, setVote] = useState<"good" | "bad">("good");
  const duration = formatCallClock(lastCall?.durationSec ?? 0);
  const spent = lastCall?.coinsSpent ?? 0;

  return (
    <div className="overlay-card is-endcall" role="dialog" aria-labelledby="endcall-title">
      <OverlayClose variant="endcall" />
      <h2 id="endcall-title">{t("overlay.endTitle")}</h2>
      <p className="endcall-name">{girl.name}</p>
      <div className="endcall-avatar">
        <img src={girl.avatar} alt="" />
        <span className="endcall-live" />
      </div>
      <div className="endcall-stats">
        <div>
          <span>{t("overlay.duration")}</span>
          <strong>{duration}</strong>
        </div>
        <i />
        <div>
          <span>{t("overlay.spent")}</span>
          <strong className="is-cyan">{spent}</strong>
        </div>
      </div>
      <div className="endcall-votes">
        <button className={`endcall-vote press ${vote === "bad" ? "is-on" : ""}`} type="button" onClick={() => setVote("bad")}>
          <span className="icon-box" style={{ width: 28, height: 27 }}>
            <img className="icon" src={publicUrl("/icons/endcall-bad.svg")} alt="" />
          </span>
          {t("overlay.bad")}
        </button>
        <button className={`endcall-vote press ${vote === "good" ? "is-on" : ""}`} type="button" onClick={() => setVote("good")}>
          <span className="icon-box" style={{ width: 28, height: 27 }}>
            <img className="icon" src={publicUrl("/icons/endcall-good.svg")} alt="" />
          </span>
          {t("overlay.good")}
        </button>
      </div>
      <button className="btn-primary press" type="button" onClick={close}>
        {t("common.done")}
      </button>
    </div>
  );
}

function OverlayClose({ variant }: { variant?: "checkin" | "rate" | "promo" | "endcall" | "reward3" | "welcome" }) {
  const close = useAppStore((s) => s.closeOverlay);
  const floating = variant === "rate" || variant === "promo" || variant === "endcall" || variant === "reward3" || variant === "welcome";
  return (
    <button className={`overlay-x press ${floating ? "is-rate" : ""} ${variant === "promo" ? "is-promo" : ""} ${variant === "endcall" ? "is-endcall" : ""} ${variant === "reward3" ? "is-reward3" : ""} ${variant === "welcome" ? "is-welcome" : ""}`} type="button" aria-label={t("common.close")} onClick={close}>
      <span className="icon-box" style={{ width: variant === "promo" ? 14 : 12, height: variant === "promo" ? 14 : 12 }}>
        <img className="icon" src={variant === "endcall" ? publicUrl("/icons/endcall-close.svg") : variant === "promo" ? publicUrl("/icons/promo-close.svg") : publicUrl("/icons/pop-close.svg")} alt="" />
      </span>
    </button>
  );
}

const WELCOME_PRIVILEGES = [
  { id: "call", icon: publicUrl("/icons/welcome-call.svg"), w: 20, h: 16 },
  { id: "msg", icon: publicUrl("/icons/welcome-chat.svg"), w: 20, h: 20 },
  { id: "access", icon: publicUrl("/icons/welcome-key.svg"), w: 22, h: 12 },
  { id: "date", icon: publicUrl("/icons/welcome-heart.svg"), w: 20, h: 18 },
] as const;

function welcomeTitle(id: (typeof WELCOME_PRIVILEGES)[number]["id"]) {
  if (id === "call") return t("welcome.call");
  if (id === "msg") return t("welcome.msg");
  if (id === "access") return t("welcome.access");
  return t("welcome.dating");
}

function welcomeCopy(id: (typeof WELCOME_PRIVILEGES)[number]["id"], starterLeft: number, freeCallUsed: boolean) {
  if (id === "call") return freeCallUsed ? t("welcome.callUsed") : t("welcome.callCopy");
  if (id === "msg") {
    if (starterLeft > 1) return t("welcome.msgMany", { n: starterLeft });
    if (starterLeft === 1) return t("welcome.msgOne");
    return t("welcome.msgNone");
  }
  if (id === "access") return t("welcome.accessCopy");
  return t("welcome.datingCopy");
}

function WelcomeCard() {
  const claimWelcome = useAppStore((s) => s.claimWelcome);
  const starterLeft = useAppStore((s) => s.deviceNewbie.starterLeft);
  const freeCallUsed = useAppStore((s) => s.deviceNewbie.lastFreeCallDate) === todayKey();

  return (
    <div className="overlay-card is-welcome" role="dialog" aria-labelledby="welcome-title">
      <OverlayClose variant="welcome" />
      <div className="welcome-hero" aria-hidden>
        <span className="icon-box" style={{ width: 43, height: 41 }}>
          <img className="icon" src={publicUrl("/icons/welcome-popper.svg")} alt="" />
        </span>
      </div>
      <h2 id="welcome-title">{t("welcome.title")}</h2>
      <p>
        {t("welcome.sub1")}
        <br />
        {t("welcome.sub2")}
      </p>
      <p className="welcome-kicker">{t("welcome.kicker")}</p>
      <ul className="welcome-list">
        {WELCOME_PRIVILEGES.map((item) => (
          <li key={item.id}>
            <span className="welcome-ico">
              <span className="icon-box" style={{ width: item.w, height: item.h }}>
                <img className="icon" src={item.icon} alt="" />
              </span>
            </span>
            <span>
              <strong>{welcomeTitle(item.id)}</strong>
              <small>{welcomeCopy(item.id, starterLeft, freeCallUsed)}</small>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn-primary press" type="button" onClick={claimWelcome}>
        {t("welcome.claim")}
        <span className="icon-box" style={{ width: 12, height: 12 }}>
          <img className="icon" src={publicUrl("/icons/arrow.svg")} alt="" />
        </span>
      </button>
    </div>
  );
}

function Reward3Card() {
  const close = useAppStore((s) => s.closeOverlay);
  const payBusy = useAppStore((s) => s.payBusy);
  const buyReward3 = useAppStore((s) => s.buyReward3);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const glowMask = publicUrl("/reward3/glow-mask.svg");
  const stageMask = publicUrl("/reward3/stage-mask.svg");

  const onBuy = () => {
    if (payBusy) return;
    startPurchase(reward3Iap(), () => {
      buyReward3();
      close();
    });
  };

  return (
    <div className="overlay-card is-reward3" role="dialog" aria-labelledby="reward3-title">
      <div className="reward3-fit">
        <div className="reward3-board">
          <div
            className="reward3-glow"
            aria-hidden
            style={{ maskImage: `url("${glowMask}")`, WebkitMaskImage: `url("${glowMask}")` }}
          >
            <img src={publicUrl("/reward3/art.png")} alt="" />
          </div>
          <img className="reward3-ring" src={publicUrl("/reward3/neon-ring.svg")} alt="" />
          <p className="reward3-kicker">
            <span />
            {t("reward.kicker")}
            <span />
          </p>
          <p className="reward3-num">
            <span>0</span>
          </p>
          <p className="reward3-unit">
            <span>{t("reward.unit")}</span>
          </p>
          <span className="reward3-sparks" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <div
            className="reward3-stage"
            aria-hidden
            style={{ maskImage: `url("${stageMask}")`, WebkitMaskImage: `url("${stageMask}")` }}
          >
            <img src={publicUrl("/reward3/art.png")} alt="" />
          </div>
          <h2 id="reward3-title" className="reward3-line is-calls">
            {t("reward.calls")}
          </h2>
          <p className="reward3-line is-days">
            {t("reward.for")} <em>{t("reward.days")}</em>
          </p>
          <span className="reward3-underline" aria-hidden />
          <p className="reward3-price">
            <s>$29.99</s>
            <span aria-hidden>|</span>
            <strong>{t("reward.just")}</strong>
          </p>
          <button className="reward3-cta press" type="button" onClick={onBuy}>
            {t("reward.cta")}
          </button>
          <OverlayClose variant="reward3" />
        </div>
      </div>
    </div>
  );
}

function PromoCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const navigate = useNavigate();
  const boughtNewbieOffer = useAppStore((s) => s.boughtNewbieOffer);
  const payBusy = useAppStore((s) => s.payBusy);
  const buyNewbieOffer = useAppStore((s) => s.buyNewbieOffer);
  const startPurchase = useAppStore((s) => s.startPurchase);

  const onBuy = () => {
    if (payBusy) return;
    if (boughtNewbieOffer) {
      close();
      navigate("/coins");
      return;
    }
    startPurchase(newbieIap(), () => {
      buyNewbieOffer();
      close();
    });
  };

  return (
    <div className="overlay-card is-promo" role="dialog" aria-labelledby="promo-title">
      <img className="promo-hero" src={publicUrl("/images/promo-hero.jpg")} alt="" />
      <div className="promo-shade" />
      <OverlayClose variant="promo" />
      <div className="promo-body">
        <div className="promo-live">
          <span className="dot" />
          {t("promo.live")}
        </div>
        <h2 id="promo-title">{t("promo.title")}</h2>
        <p>{t("promo.wait")}</p>
        <div className="promo-pack">
          <div className="promo-coins">
            <span className="icon-box" style={{ width: 16, height: 14 }}>
              <img className="icon" src={publicUrl("/icons/promo-coin.svg")} alt="" />
            </span>
            {t("promo.coins")}
          </div>
          <div className="promo-price">
            <s>$2.99</s>
            <div>
              <span>{t("promo.now")}</span>
              <strong>$1.99</strong>
            </div>
          </div>
        </div>
        <button className="btn-primary press" type="button" onClick={onBuy}>
          {t("promo.cta")}
          <span className="icon-box" style={{ width: 20, height: 16 }}>
            <img className="icon" src={publicUrl("/icons/promo-call.svg")} alt="" />
          </span>
        </button>
      </div>
    </div>
  );
}

function TaskCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const claimDaily = useAppStore((s) => s.claimDaily);
  const lastCheckInDate = useAppStore((s) => s.lastCheckInDate);
  const checkInCount = useAppStore((s) => s.checkInCount);
  const { claimedToday, day, reward } = resolveCheckIn(lastCheckInDate, checkInCount);

  return (
    <div className="overlay-card is-checkin" role="dialog" aria-labelledby="checkin-title">
      <div className="checkin-glow" />
      <header className="checkin-head">
        <div>
          <h2 id="checkin-title">{t("task.title")}</h2>
          <p>
            {t("task.sub1")}
            <br />
            {t("task.sub2")}
          </p>
        </div>
        <OverlayClose variant="checkin" />
      </header>
      <div className="checkin-grid">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isToday = n === day;
          return (
            <div key={n} className={`checkin-cell ${isToday ? "is-today" : ""}`}>
              <span>{isToday && !claimedToday ? t("task.today") : t("task.day", { n })}</span>
              {isToday ? (
                <span className="icon-box checkin-coin" style={{ width: 27, height: 27 }}>
                  <img className="icon" src={publicUrl("/icons/checkin-coin.svg")} alt="" />
                </span>
              ) : (
                <span className="icon-box" style={{ width: 20, height: 17 }}>
                  <img className="icon" src={publicUrl("/images/checkin-gem.png")} alt="" />
                </span>
              )}
              <strong>{CHECKIN_REWARD}</strong>
            </div>
          );
        })}
        <div className={`checkin-bonus ${day === 7 ? "is-today" : ""}`}>
          <span className="checkin-gift">
            <span className="icon-box" style={{ width: 20, height: 19 }}>
              <img className="icon" src={publicUrl("/icons/checkin-gift.svg")} alt="" />
            </span>
          </span>
          <div>
            <span>{t("task.day7")}</span>
            <strong>{t("task.mystery")}</strong>
          </div>
          <em>
            <span className="icon-box" style={{ width: 20, height: 17 }}>
              <img className="icon" src={publicUrl("/images/checkin-gem.png")} alt="" />
            </span>
            {CHECKIN_BONUS}+
          </em>
        </div>
      </div>
      <button
        className="btn-primary press"
        type="button"
        onClick={() => {
          if (claimedToday) close();
          else claimDaily();
        }}
      >
        {claimedToday ? t("task.tomorrow") : t("task.claim", { n: day === 7 ? CHECKIN_BONUS : reward })}
      </button>
    </div>
  );
}

function RateCard() {
  const close = useAppStore((s) => s.closeOverlay);
  const ratedUs = useAppStore((s) => s.ratedUs);
  return (
    <div className="overlay-card is-rate" role="dialog" aria-labelledby="rate-title">
      <OverlayClose variant="rate" />
      <div className="rate-hero">
        <div className="rate-stars">
          <span className="icon-box rate-star is-l" style={{ width: 24, height: 23 }}>
            <img className="icon" src={publicUrl("/icons/rate-star-l.svg")} alt="" />
          </span>
          <span className="icon-box rate-star is-c" style={{ width: 25, height: 24 }}>
            <img className="icon" src={publicUrl("/icons/rate-star-c.svg")} alt="" />
          </span>
          <span className="icon-box rate-star is-r" style={{ width: 24, height: 23 }}>
            <img className="icon" src={publicUrl("/icons/rate-star-r.svg")} alt="" />
          </span>
        </div>
        <div className="rate-coin">
          <span>+{RATE_REWARD}</span>
        </div>
      </div>
      <h2 id="rate-title">{t("rate.title")}</h2>
      <p className="rate-copy">
        {ratedUs ? (
          t("rate.thanks", { n: RATE_REWARD })
        ) : locale() === "en" ? (
          <>
            Give us a <em>5-star</em> in the App
            <br />
            Store to get <strong>100 Coins</strong>.
          </>
        ) : (
          t("rate.body")
        )}
      </p>
      <div className="rate-actions">
        {ratedUs ? (
          <button className="btn-primary press" type="button" onClick={close}>
            {t("common.close")}
          </button>
        ) : (
          <>
            <a
              className="btn-primary press"
              href={appStoreReviewUrl()}
              onClick={() => {
                window.setTimeout(() => useAppStore.getState().claimRate(), 400);
              }}
            >
              {t("me.rateNow")}
            </a>
            <button className="overlay-later press" type="button" onClick={close}>
              {t("rate.later")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
