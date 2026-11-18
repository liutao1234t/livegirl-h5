import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGirl } from "../data/girls";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { publicUrl } from "../lib/publicUrl";
import { t, type MessageKey } from "../i18n";

const reasons = ["report.inappropriate", "report.harassment", "report.spam", "report.impersonation", "report.other"] as const satisfies readonly MessageKey[];

export function ReportPage() {
  const { id = "isabella" } = useParams();
  const girl = getGirl(id);
  const navigate = useNavigate();
  const [pick, setPick] = useState(-1);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const handle = girl.name.toLowerCase();

  return (
    <StackShell
      header={<StackBar title={t("report.title")} />}
      footer={
        done ? null : (
          <div className="report-foot">
            <button
              className="btn-primary press"
              type="button"
              disabled={pick < 0}
              onClick={() => setDone(true)}
            >
              <span className="icon-box" style={{ width: 15, height: 17 }}>
                <img className="icon" src={publicUrl("/icons/report-flag.svg")} alt="" />
              </span>
              {t("report.submit")}
            </button>
          </div>
        )
      }
    >
      <div className="stk-pad report-page">
        {done ? (
          <>
            <p>{t("report.thanks", { name: girl.name })}</p>
            <button className="btn-primary press" type="button" onClick={() => navigate(-1)}>
              {t("common.done")}
            </button>
          </>
        ) : (
          <>
            <div className="report-target">
              <img src={girl.avatar} alt="" />
              <span>
                <strong>{t("report.reporting", { name: handle })}</strong>
                <small>{t("report.private")}</small>
              </span>
            </div>
            <h2 className="report-h">{t("report.reason")}</h2>
            <div className="report-reasons">
              {reasons.map((r, i) => (
                <button
                  key={r}
                  className={`report-opt press ${pick === i ? "is-on" : ""}`}
                  type="button"
                  onClick={() => setPick(i)}
                >
                  {t(r)}
                  <span className={`radio ${pick === i ? "is-on" : ""}`} />
                </button>
              ))}
            </div>
            <div className={`report-more ${pick < 0 ? "is-dim" : ""}`}>
              <h3>{t("report.more")}</h3>
              <textarea
                rows={4}
                placeholder={t("report.placeholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <aside className="report-note">
              <span className="icon-box" style={{ width: 16, height: 22 }}>
                <img className="icon" src={publicUrl("/icons/report-shield.svg")} alt="" />
              </span>
              <p>{t("report.note")}</p>
            </aside>
          </>
        )}
      </div>
    </StackShell>
  );
}
