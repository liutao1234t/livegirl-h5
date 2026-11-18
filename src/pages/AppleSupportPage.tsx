import { useEffect, useState, type AnimationEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { t, type MessageKey } from "../i18n";

const reasons: { label: MessageKey; lines: readonly MessageKey[] }[] = [
  { label: "apple.refund", lines: ["apple.refund"] },
  { label: "apple.fraud", lines: ["apple.fraud1", "apple.fraud2"] },
  { label: "apple.offensive", lines: ["apple.off1", "apple.off2"] },
];

export function AppleSupportPage() {
  const navigate = useNavigate();
  const submitted = useAppStore((s) => s.appleSupportSubmitted);
  const submitAppleSupport = useAppStore((s) => s.submitAppleSupport);
  const clearAppleSupport = useAppStore((s) => s.clearAppleSupport);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = pick === null ? null : reasons[pick];
  const menuShown = open || closing;
  const checkIndex = menuShown ? (pick ?? 0) : pick;
  const canNext = selected !== null;

  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => {
      submitAppleSupport();
    }, 3000);
    return () => window.clearTimeout(id);
  }, [loading, submitAppleSupport]);

  const onNext = () => {
    if (!canNext || loading) return;
    setOpen(false);
    setClosing(false);
    setLoading(true);
  };

  const onCancel = () => {
    setOpen(false);
    setClosing(false);
    setPick(null);
    setLoading(false);
    clearAppleSupport();
  };

  const openMenu = () => {
    setClosing(false);
    setOpen(true);
  };

  const closeMenu = () => {
    if (!open) return;
    setOpen(false);
    setClosing(true);
  };

  const toggleMenu = () => {
    if (open) closeMenu();
    else openMenu();
  };

  const onMenuAnimEnd = (e: AnimationEvent<HTMLUListElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== "as-pop-out") return;
    setClosing(false);
  };

  return (
    <StackShell header={<StackBar title={t("apple.title")} />}>
      <div
        className={`as-web ${submitted ? "is-done" : ""} ${open ? "is-pick" : ""}`}
        onClick={() => {
          if (open) closeMenu();
        }}
      >
        <div className="as-chrome">
          <span className="icon-box as-apple" style={{ width: 24, height: 24 }}>
            <img className="icon" src={publicUrl("/icons/apple-mark.svg")} alt="" />
          </span>
          <span className="as-menu" aria-hidden>
            <i />
            <i />
          </span>
        </div>

        <div className="as-card" aria-hidden />

        <h2 className="as-title">{t("apple.issue")}</h2>
        <button className="as-signout press" type="button" onClick={() => navigate("/app/me")}>
          {t("apple.signOut")}
        </button>
        <div className="as-rule" />

        {submitted ? (
          <>
            <p className="as-status">
              <strong>{t("apple.submitted")}</strong>
              {t("apple.notify")}
            </p>
            <div className="as-actions">
              <button className="as-cancel press" type="button" onClick={onCancel}>
                {t("common.cancel")}
              </button>
              <button className="as-done press" type="button" onClick={() => navigate("/app/me")}>
                {t("common.done")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="as-help">{t("apple.help")}</p>
            <div className="as-ask">{t("apple.ask")}</div>
            <button
              className={`as-field press ${selected ? "is-filled" : ""}`}
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu();
              }}
            >
              {selected ? t(selected.label) : t("apple.need")}
            </button>
            <button
              className={`as-next press ${canNext ? "is-on" : ""} ${loading ? "is-wait" : ""}`}
              type="button"
              disabled={!canNext || loading}
              aria-busy={loading}
              aria-label={loading ? t("common.submitting") : t("common.next")}
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              {loading ? (
                <span className="as-daisy">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i key={i} style={{ "--i": i } as CSSProperties} />
                  ))}
                </span>
              ) : (
                t("common.next")
              )}
            </button>
            {menuShown ? (
              <ul
                className={`as-menu-list ${open ? "is-in" : "is-out"}`}
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={onMenuAnimEnd}
              >
                {reasons.map((reason, i) => (
                  <li key={reason.label}>
                    <button
                      className="as-opt press"
                      type="button"
                      onClick={() => setPick(i)}
                    >
                      {checkIndex === i ? (
                        <span className="icon-box as-check" style={{ width: 22, height: 22 }}>
                          <img className="icon" src={publicUrl("/icons/apple-check.svg")} alt="" />
                        </span>
                      ) : (
                        <span className="as-opt-gap" />
                      )}
                      <span className="as-opt-text">
                        {reason.lines.map((line) => (
                          <span key={line} className="as-opt-line">
                            {t(line)}
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </StackShell>
  );
}
