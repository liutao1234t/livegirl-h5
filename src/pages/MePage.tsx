import { useNavigate } from "react-router-dom";
import { TabShell } from "../shells/Shells";
import { RATE_REWARD, useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

export function MePage() {
  const navigate = useNavigate();
  const coins = useAppStore((s) => s.coins);
  const following = useAppStore((s) => s.followedIds.length);
  const favorites = useAppStore((s) => s.favorites);
  const dailyTaskDot = useAppStore((s) => s.dailyTaskDot);
  const ratedUs = useAppStore((s) => s.ratedUs);
  const nickname = useAppStore((s) => s.profile.nickname);
  const userId = useAppStore((s) => s.userId);
  const openOverlay = useAppStore((s) => s.openOverlay);

  return (
    <TabShell
      header={
        <header className="home-header">
          <h1 className="logo" style={{ fontStyle: "normal" }}>
            Me
          </h1>
          <button className="press" type="button" aria-label="Settings" onClick={() => navigate("/settings")}>
            <span className="icon-box" style={{ width: 20, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/settings.svg")} alt="" />
            </span>
          </button>
        </header>
      }
    >
      <section className="me-card">
        <img className="me-avatar" src={publicUrl("/images/me-avatar.png")} alt="" />
        <h2>{nickname}</h2>
        <p>ID: {userId ?? "—"}</p>
        <div className="me-wallet">
          <span>
            <span className="icon-box" style={{ width: 17, height: 15 }}>
              <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
            </span>
            {coins.toLocaleString()}
          </span>
          <button className="buy-coins press" type="button" onClick={() => navigate("/coins")}>
            Buy Coins
          </button>
        </div>
      </section>

      <div className="me-stats">
        <div>
          <strong>{following}</strong>
          <span>Following</span>
        </div>
        <div>
          <strong>{favorites}</strong>
          <span>Favorites</span>
        </div>
      </div>

      <button className="me-row press" type="button" onClick={() => navigate("/vip")}>
        <span className="me-ico teal">
          <span className="icon-box" style={{ width: 20, height: 18 }}>
            <img className="icon" src={publicUrl("/icons/vip.svg")} alt="" />
          </span>
        </span>
        <span>VIP Center</span>
        <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
          <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
        </span>
      </button>

      <div className="me-group">
        <button className="me-row press" type="button" onClick={() => openOverlay("rateUs")}>
          <span className="me-ico">
            <span className="icon-box" style={{ width: 20, height: 19 }}>
              <img className="icon" src={publicUrl("/icons/rate.svg")} alt="" />
            </span>
          </span>
          <span>
            Rate Us
            <small>{ratedUs ? "Claimed" : `+${RATE_REWARD} Coins`}</small>
          </span>
          <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
          </span>
        </button>
        <button className="me-row press" type="button" onClick={() => openOverlay("dailyTask")}>
          <span className="me-ico">
            <span className="icon-box" style={{ width: 20, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/task.svg")} alt="" />
            </span>
          </span>
          <span>Daily Task</span>
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
          <span>Online Support</span>
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
          <span>Apple Support</span>
          <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
          </span>
        </button>
      </div>
    </TabShell>
  );
}
