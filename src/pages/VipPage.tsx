import { useNavigate } from "react-router-dom";
import { IAP_VIP } from "../data/iap";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

const benefits = [
  { icon: publicUrl("/icons/vip-reel.svg"), w: 20, h: 16, title: "Unlock Short Videos", copy: "Access premium content" },
  { icon: publicUrl("/icons/vip-chat.svg"), w: 20, h: 20, title: "Unlimited Free Message", copy: "Connect without limits" },
  { icon: publicUrl("/icons/vip-coin.png"), w: 20, h: 17, title: "2,000 Coins Now", copy: "Get rewarded immediately" },
  { icon: publicUrl("/icons/vip-video.svg"), w: 20, h: 16, title: "50% Off Video Calls Fee", copy: "Chat longer for less" },
  { icon: publicUrl("/icons/vip-contact.svg"), w: 20, h: 22, title: "Exchange Contacts", copy: "Private connections" },
  { icon: publicUrl("/icons/vip-date.svg"), w: 20, h: 18, title: "Offline Dating Privileges", copy: "Initiate local dates" },
];

export function VipPage() {
  const navigate = useNavigate();
  const isVip = useAppStore((s) => s.isVip);
  const payBusy = useAppStore((s) => s.payBusy);
  const buyVip = useAppStore((s) => s.buyVip);
  const startPurchase = useAppStore((s) => s.startPurchase);

  return (
    <StackShell
      header={<StackBar title="VIP" />}
      footer={
        <div className="vip-foot">
          <p>
            <strong>$29.99</strong> <span>/ One Time</span>
          </p>
          <button
            className="btn-primary press"
            type="button"
            disabled={isVip || payBusy}
            onClick={() => {
              if (isVip || payBusy) return;
              startPurchase(IAP_VIP, () => {
                buyVip();
                navigate(-1);
              });
            }}
          >
            {isVip ? "VIP Active" : "Get Now"}
          </button>
        </div>
      }
    >
      <div className="stk-pad vip-hero">
        <div className="vip-intro">
          <div className="vip-gem">
            <span className="icon-box" style={{ width: 48, height: 43 }}>
              <img className="icon" src={publicUrl("/icons/vip-gem.svg")} alt="" />
            </span>
          </div>
          <h2>Become VIP</h2>
          <p>Unlock the premium privilege</p>
        </div>
        <div className="vip-list">
          {benefits.map((b) => (
            <article key={b.title} className="vip-card">
              <span className="stk-ico lg">
                <span className="icon-box" style={{ width: b.w, height: b.h }}>
                  <img className="icon" src={b.icon} alt="" />
                </span>
              </span>
              <span>
                <strong>{b.title}</strong>
                <small>{b.copy}</small>
              </span>
            </article>
          ))}
        </div>
      </div>
    </StackShell>
  );
}
