import { useEffect, useState, type AnimationEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getGirl } from "../data/girls";
import { IAP_NEWBIE, IAP_REWARD3 } from "../data/iap";
import { gifts } from "../data/shop";
import { APP_STORE_REVIEW_URL } from "../lib/nativeShare";
import { openCoinShop } from "../lib/paywall";
import { CoinPackGrid } from "../pages/CoinPacks";
import {
  CHECKIN_BONUS,
  CHECKIN_REWARD,
  RATE_REWARD,
  formatCallClock,
  resolveCheckIn,
  useAppStore,
  type OverlayId,
} from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

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
    const ms = shown === "gift" || shown === "coins" ? 280 : shown === "newMsg" ? 220 : 400;
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

  return (
    <>
      {!shown ? (
        <div className="overlay-root" />
      ) : (
    <div className={`overlay-root${isBanner ? " is-toast" : " is-open"}${isSheet ? " is-sheet" : ""}${leaving ? " is-leaving" : ""}`}>
      {isBanner ? null : <button className="overlay-mask" aria-label="Close" onClick={leaving ? undefined : close} />}
      {isSheet ? (
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
            <CenterCard title="Not enough coins" copy="Top up to keep the conversation going." cta="Get coins" onCta={() => openCoinShop(navigate)} />
          ) : null}
          {shown === "confirmLogout" ? (
            <CenterCard
              title="Log Out"
              copy="You’ll see the splash again. Progress stays on this device."
              cta="Log Out"
              danger
              onCta={() => runAccountReset("logout")}
            />
          ) : null}
          {shown === "confirmDelete" ? (
            <CenterCard
              title="Delete Account"
              copy="This erases all progress on this device. You’ll start over from the splash screen."
              cta="Delete"
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
    <div className="overlay-root is-open is-pay" role="alertdialog" aria-busy="true" aria-label="Loading">
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
  const preview = last?.text ? `${girl.name}: ${last.text}` : "Tap to open chat";

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
          <time className="newmsg-time">now</time>
        </span>
        <strong id="newmsg-title" className="newmsg-title">
          New Message
        </strong>
        <span className="newmsg-preview">{preview}</span>
      </span>
    </button>
  );
}

function CenterCard({
  title,
  copy,
  cta = "Close",
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
    <div className="sheet" role="dialog" aria-label="Gifts">
      <header className="sheet-head">
        <h2>Gifts</h2>
        <span className="sheet-coins">
          <img src={publicUrl("/images/coin.png")} alt="" />
          {coins.toLocaleString()}
          <button
            className="sheet-plus press"
            type="button"
            aria-label="Get coins"
            onClick={() => openCoinShop(navigate)}
          >
            <span className="icon-box" style={{ width: 10, height: 10 }}>
              <img className="icon" src={publicUrl("/icons/sheet-plus.svg")} alt="" />
            </span>
          </button>
        </span>
        <button className="sheet-x press" type="button" aria-label="Close" onClick={close}>
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
            <strong>{g.name}</strong>
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
        Send Gift
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
    <div className="sheet is-coins" role="dialog" aria-label="Coins">
      <header className="sheet-head">
        <h2>COINS</h2>
        <span className="sheet-coins">
          <img src={publicUrl("/images/coin.png")} alt="" />
          {coins.toLocaleString()}
        </span>
        <button className="sheet-x press" type="button" aria-label="Close" onClick={close}>
          <span className="icon-box" style={{ width: 14, height: 14 }}>
            <img className="icon" src={publicUrl("/icons/sheet-close.svg")} alt="" />
          </span>
        </button>
      </header>
      <p className="coins-lead">
        Top up your balance to continue the
        <br />
        conversation.
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
        <h2 id="unlock-title">VIP Required</h2>
        <p>Go VIP for unlimited videos, Message, and more.</p>
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
          Become VIP
        </button>
        <button className="overlay-later press" type="button" onClick={close}>
          Maybe later
        </button>
      </div>
      <p className="unlock-price">Only $29.99</p>
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
      <h2 id="endcall-title">How About This Call?</h2>
      <p className="endcall-name">{girl.name}</p>
      <div className="endcall-avatar">
        <img src={girl.avatar} alt="" />
        <span className="endcall-live" />
      </div>
      <div className="endcall-stats">
        <div>
          <span>Duration</span>
          <strong>{duration}</strong>
        </div>
        <i />
        <div>
          <span>Coins spent</span>
          <strong className="is-cyan">{spent}</strong>
        </div>
      </div>
      <div className="endcall-votes">
        <button className={`endcall-vote press ${vote === "bad" ? "is-on" : ""}`} type="button" onClick={() => setVote("bad")}>
          <span className="icon-box" style={{ width: 28, height: 27 }}>
            <img className="icon" src={publicUrl("/icons/endcall-bad.svg")} alt="" />
          </span>
          Bad
        </button>
        <button className={`endcall-vote press ${vote === "good" ? "is-on" : ""}`} type="button" onClick={() => setVote("good")}>
          <span className="icon-box" style={{ width: 28, height: 27 }}>
            <img className="icon" src={publicUrl("/icons/endcall-good.svg")} alt="" />
          </span>
          Good
        </button>
      </div>
      <button className="btn-primary press" type="button" onClick={close}>
        Done
      </button>
    </div>
  );
}

function OverlayClose({ variant }: { variant?: "checkin" | "rate" | "promo" | "endcall" | "reward3" | "welcome" }) {
  const close = useAppStore((s) => s.closeOverlay);
  const floating = variant === "rate" || variant === "promo" || variant === "endcall" || variant === "reward3" || variant === "welcome";
  return (
    <button className={`overlay-x press ${floating ? "is-rate" : ""} ${variant === "promo" ? "is-promo" : ""} ${variant === "endcall" ? "is-endcall" : ""} ${variant === "reward3" ? "is-reward3" : ""} ${variant === "welcome" ? "is-welcome" : ""}`} type="button" aria-label="Close" onClick={close}>
      <span className="icon-box" style={{ width: variant === "promo" ? 14 : 12, height: variant === "promo" ? 14 : 12 }}>
        <img className="icon" src={variant === "endcall" ? publicUrl("/icons/endcall-close.svg") : variant === "promo" ? publicUrl("/icons/promo-close.svg") : publicUrl("/icons/pop-close.svg")} alt="" />
      </span>
    </button>
  );
}

const WELCOME_PRIVILEGES = [
  { icon: publicUrl("/icons/welcome-call.svg"), w: 20, h: 16, title: "Free Daily Call", copy: "One 15s video call every day." },
  { icon: publicUrl("/icons/welcome-chat.svg"), w: 20, h: 20, title: "Free Messaging", copy: "Start with 5 free messages." },
  { icon: publicUrl("/icons/welcome-key.svg"), w: 22, h: 12, title: "Direct Access", copy: "Unlock private contact details." },
  { icon: publicUrl("/icons/welcome-heart.svg"), w: 20, h: 18, title: "Real-World Dating", copy: "One chance to initiate an offline date." },
] as const;

function WelcomeCard() {
  const claimWelcome = useAppStore((s) => s.claimWelcome);

  return (
    <div className="overlay-card is-welcome" role="dialog" aria-labelledby="welcome-title">
      <OverlayClose variant="welcome" />
      <div className="welcome-hero" aria-hidden>
        <span className="icon-box" style={{ width: 43, height: 41 }}>
          <img className="icon" src={publicUrl("/icons/welcome-popper.svg")} alt="" />
        </span>
      </div>
      <h2 id="welcome-title">Welcome to LiveGirl</h2>
      <p>
        Experience the world's most vibrant 1v1
        <br />
        video community.
      </p>
      <p className="welcome-kicker">YOUR NEWBIE PRIVILEGES</p>
      <ul className="welcome-list">
        {WELCOME_PRIVILEGES.map((item) => (
          <li key={item.title}>
            <span className="welcome-ico">
              <span className="icon-box" style={{ width: item.w, height: item.h }}>
                <img className="icon" src={item.icon} alt="" />
              </span>
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn-primary press" type="button" onClick={claimWelcome}>
        Claim My Privileges
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

  const onBuy = () => {
    if (payBusy) return;
    startPurchase(IAP_REWARD3, () => {
      buyReward3();
      close();
    });
  };

  return (
    <div className="overlay-card is-reward3" role="dialog" aria-labelledby="reward3-title">
      <OverlayClose variant="reward3" />
      <p className="reward3-kicker">LIMITED BONUS</p>
      <div className="reward3-hero" aria-hidden>
        <span className="reward3-num">3</span>
      </div>
      <h2 id="reward3-title">Unlimited Calls for 3 Days</h2>
      <p>
        Enjoy LiveGirl Premium
        <br />
        with no limits.
      </p>
      <p className="reward3-price">
        Just $19.99 <s>$49.99</s>
      </p>
      <button className="btn-primary press" type="button" onClick={onBuy}>
        GET IT NOW
        <span className="icon-box" style={{ width: 12, height: 12 }}>
          <img className="icon" src={publicUrl("/icons/arrow.svg")} alt="" />
        </span>
      </button>
      <button className="overlay-later press" type="button" onClick={close}>
        Maybe later
      </button>
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
    startPurchase(IAP_NEWBIE, () => {
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
          LIVE NOW
        </div>
        <h2 id="promo-title">New User Offer</h2>
        <p>She’s waiting for you!</p>
        <div className="promo-pack">
          <div className="promo-coins">
            <span className="icon-box" style={{ width: 16, height: 14 }}>
              <img className="icon" src={publicUrl("/icons/promo-coin.svg")} alt="" />
            </span>
            150 Coins
          </div>
          <div className="promo-price">
            <s>$2.99</s>
            <div>
              <span>NOW ONLY</span>
              <strong>$1.99</strong>
            </div>
          </div>
        </div>
        <button className="btn-primary press" type="button" onClick={onBuy}>
          Call Now!
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
          <h2 id="checkin-title">7-Day Check-in</h2>
          <p>
            Claim your rewards daily to unlock
            <br />
            the mystery box.
          </p>
        </div>
        <OverlayClose variant="checkin" />
      </header>
      <div className="checkin-grid">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isToday = n === day;
          return (
            <div key={n} className={`checkin-cell ${isToday ? "is-today" : ""}`}>
              <span>{isToday && !claimedToday ? "Today" : `Day ${n}`}</span>
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
            <span>Day 7 Bonus</span>
            <strong>Mystery Box</strong>
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
        {claimedToday ? "Come back tomorrow" : day === 7 ? `Claim ${CHECKIN_BONUS} Coins` : `Claim ${reward} Coins`}
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
      <h2 id="rate-title">Enjoying our app?</h2>
      <p className="rate-copy">
        {ratedUs ? (
          `Thanks — +${RATE_REWARD} coins already added.`
        ) : (
          <>
            Give us a <em>5-star</em> in the App
            <br />
            Store to get <strong>100 Coins</strong>.
          </>
        )}
      </p>
      <div className="rate-actions">
        {ratedUs ? (
          <button className="btn-primary press" type="button" onClick={close}>
            Close
          </button>
        ) : (
          <>
            <a
              className="btn-primary press"
              href={APP_STORE_REVIEW_URL}
              onClick={() => {
                window.setTimeout(() => useAppStore.getState().claimRate(), 400);
              }}
            >
              Rate Now
            </a>
            <button className="overlay-later press" type="button" onClick={close}>
              Maybe Later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
