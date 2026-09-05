import { useRef, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { openNewUserOffer } from "../lib/paywall";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

const tabs = [
  { id: "home", to: "/app/home", label: "Home", icon: publicUrl("/icons/tab-home.svg") },
  { id: "reels", to: "/app/reels", label: "Reels", icon: publicUrl("/icons/tab-reels.svg") },
  { id: "ranking", to: "/app/ranking", label: "Ranking", icon: publicUrl("/icons/tab-ranking.svg") },
  { id: "messages", to: "/app/messages", label: "Messages", icon: publicUrl("/icons/tab-messages.svg") },
  { id: "me", to: "/app/me", label: "Me", icon: publicUrl("/icons/tab-me.svg") },
] as const;

export function OfferGiftButton() {
  const navigate = useNavigate();
  const boughtNewbieOffer = useAppStore((s) => s.boughtNewbieOffer);
  if (boughtNewbieOffer) return null;
  return (
    <div className="header-actions">
      <button className="gift-btn press" type="button" aria-label="New user offer" onClick={() => openNewUserOffer(navigate)}>
        <span className="icon-box" style={{ width: 30, height: 30 }}>
          <img className="icon" src={publicUrl("/images/gift-box.png")} alt="" />
        </span>
      </button>
    </div>
  );
}

export function TabShell({
  header,
  children,
  overlayNav,
  onRefresh,
}: {
  header?: ReactNode;
  children: ReactNode;
  overlayNav?: boolean;
  onRefresh?: () => Promise<unknown>;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { pull, refreshing } = usePullToRefresh(bodyRef, onRefresh);
  const ptr = onRefresh ? Math.max(pull, refreshing ? 56 : 0) : 0;
  const hasUnread = useAppStore((s) => {
    const called = new Set(s.calledGirlIds ?? []);
    return Object.entries(s.unread).some(([id, n]) => n > 0 && !called.has(id));
  });

  return (
    <div className={`shell-tab ${overlayNav ? "is-overlay-nav" : ""}`}>
      {header ? <div className="shell-top">{header}</div> : null}
      <div className="shell-body" ref={bodyRef}>
        {onRefresh ? (
          <div className="ptr-slot" style={{ height: ptr }} aria-hidden>
            <span className={`ptr-spinner ${refreshing || ptr > 40 ? "is-on" : ""}`} />
          </div>
        ) : null}
        {children}
      </div>
      <nav className="tab-bar" aria-label="Main">
        {tabs.map((tab) => {
          const showUnread = tab.id === "messages" && hasUnread;
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={({ isActive }) => `tab-item press ${isActive ? "is-active" : ""}`}
              aria-label={showUnread ? `${tab.label}, unread` : undefined}
              onClick={() => {
                if (tab.id === "home") {
                  useAppStore.getState().offerWelcomeIfNeeded();
                  useAppStore.getState().offerReward3IfDue();
                }
              }}
            >
              <span className="tab-icon-wrap">
                <span
                  className="tab-icon"
                  style={{
                    WebkitMaskImage: `url(${tab.icon})`,
                    maskImage: `url(${tab.icon})`,
                  }}
                  aria-hidden
                />
                {showUnread ? <span className="tab-unread" /> : null}
              </span>
              <span className="tab-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function StackShell({
  header,
  children,
  footer,
}: {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="shell-stack">
      {header ? <div className="shell-top stack-top">{header}</div> : null}
      <div className="shell-body">{children}</div>
      {footer}
    </div>
  );
}

export function FullscreenShell({ children }: { children: ReactNode }) {
  return <div className="shell-full">{children}</div>;
}
