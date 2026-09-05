import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getGirl } from "../data/girls";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { publicUrl } from "../lib/publicUrl";

const reasons = ["Inappropriate Content", "Harassment", "Spam", "Impersonation", "Other"];

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
      header={<StackBar title="Report" />}
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
              Submit Report
            </button>
          </div>
        )
      }
    >
      <div className="stk-pad report-page">
        {done ? (
          <>
            <p>Thanks. We received your report about {girl.name}.</p>
            <button className="btn-primary press" type="button" onClick={() => navigate(-1)}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className="report-target">
              <img src={girl.avatar} alt="" />
              <span>
                <strong>Reporting @{handle}</strong>
                <small>We'll keep this strictly confidential.</small>
              </span>
            </div>
            <h2 className="report-h">Select a reason</h2>
            <div className="report-reasons">
              {reasons.map((r, i) => (
                <button
                  key={r}
                  className={`report-opt press ${pick === i ? "is-on" : ""}`}
                  type="button"
                  onClick={() => setPick(i)}
                >
                  {r}
                  <span className={`radio ${pick === i ? "is-on" : ""}`} />
                </button>
              ))}
            </div>
            <div className={`report-more ${pick < 0 ? "is-dim" : ""}`}>
              <h3>Tell us more</h3>
              <textarea
                rows={4}
                placeholder="Please provide any additional details to help us understand the issue..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <aside className="report-note">
              <span className="icon-box" style={{ width: 16, height: 22 }}>
                <img className="icon" src={publicUrl("/icons/report-shield.svg")} alt="" />
              </span>
              <p>Your report is anonymous and will be reviewed by our moderation team within 24 hours. We are committed to maintaining a safe, premium space for everyone.</p>
            </aside>
          </>
        )}
      </div>
    </StackShell>
  );
}
