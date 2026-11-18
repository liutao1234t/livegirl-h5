import { useNavigate } from "react-router-dom";
import { vipIap } from "../data/iap";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { t, type MessageKey } from "../i18n";

const perks: { art: string; title: MessageKey; copy: MessageKey; tone: string }[] = [
  {
    art: publicUrl("/vip/card-shorts.png"),
    title: "vip.shortsTitle",
    copy: "vip.shortsCopy",
    tone: "shorts",
  },
  {
    art: publicUrl("/vip/card-msg.png"),
    title: "vip.msgTitle",
    copy: "vip.msgCopy",
    tone: "msg",
  },
  {
    art: publicUrl("/vip/card-contact.png"),
    title: "vip.contactTitle",
    copy: "vip.contactCopy",
    tone: "contact",
  },
  {
    art: publicUrl("/vip/card-meet.png"),
    title: "vip.meetTitle",
    copy: "vip.meetCopy",
    tone: "meet",
  },
];

export function VipPage() {
  const navigate = useNavigate();
  const isVip = useAppStore((s) => s.isVip);
  const payBusy = useAppStore((s) => s.payBusy);
  const buyVip = useAppStore((s) => s.buyVip);
  const startPurchase = useAppStore((s) => s.startPurchase);

  return (
    <StackShell
      header={
        <div className="vip-bar">
          <button className="circle-btn press" type="button" aria-label={t("common.back")} onClick={() => navigate(-1)}>
            <span className="icon-box" style={{ width: 16, height: 16 }}>
              <img className="icon" src={publicUrl("/icons/back.svg")} alt="" />
            </span>
          </button>
        </div>
      }
    >
      <div className="vip-screen">
        <img className="vip-curves" src={publicUrl("/vip/bg.svg")} alt="" />
        <header className="vip-hero">
          <img className="vip-crown" src={publicUrl("/vip/crown.png")} alt="" />
          <h2>{t("vip.upgrade")}</h2>
          <p>{t("vip.sub")}</p>
        </header>

        <div className="vip-spot">
          <article className="vip-tile vip-tile-coins">
            <img className="vip-tile-bg" src={publicUrl("/vip/card-coins.png")} alt="" />
            <div className="vip-coins-copy">
              <strong>2,000</strong>
              <b>{t("vip.bonus")}</b>
              <small>{t("vip.now")}</small>
            </div>
          </article>
          <article className="vip-tile vip-tile-video">
            <img className="vip-tile-bg" src={publicUrl("/vip/card-video.png")} alt="" />
            <span className="vip-off">{t("vip.off")}</span>
            <div className="vip-video-copy">
              <strong>{t("vip.calls")}</strong>
              <small>{t("vip.callsSub")}</small>
            </div>
          </article>
        </div>

        <div className="vip-more">
          <i />
          <img src={publicUrl("/vip/mini-crown.png")} alt="" />
          <span>{t("vip.more")}</span>
          <i />
        </div>

        <div className="vip-perks">
          {perks.map((perk) => (
            <article key={perk.tone} className={`vip-tile vip-perk is-${perk.tone}`}>
              <img className="vip-tile-bg" src={perk.art} alt="" />
              <div className="vip-perk-copy">
                <strong>
                  {t(perk.title).split("\n").map((line, index) => (
                    <span key={index}>{line}</span>
                  ))}
                </strong>
                <small>
                  {t(perk.copy).split("\n").map((line, index) => (
                    <span key={index}>{line}</span>
                  ))}
                </small>
              </div>
            </article>
          ))}
        </div>

        <section className="vip-buy">
          <img className="vip-tile-bg" src={publicUrl("/vip/card-buy.png")} alt="" />
          <p className="vip-price">
            <strong>$25.99</strong>
            <span>{t("vip.once")}</span>
          </p>
          <button
            className="vip-cta press"
            type="button"
            disabled={isVip || payBusy}
            onClick={() => {
              if (isVip || payBusy) return;
              startPurchase(vipIap(), () => {
                buyVip();
                navigate(-1);
              });
            }}
          >
            <img className="vip-cta-crown" src={publicUrl("/vip/btn-crown.png")} alt="" />
            <span>{isVip ? t("vip.active") : t("vip.get")}</span>
            <img className="vip-cta-arrow" src={publicUrl("/vip/btn-arrow.png")} alt="" />
          </button>
        </section>
      </div>
    </StackShell>
  );
}
