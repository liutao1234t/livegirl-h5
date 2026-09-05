import { useNavigate } from "react-router-dom";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

export function SettingsPage() {
  const navigate = useNavigate();
  const openOverlay = useAppStore((s) => s.openOverlay);

  return (
    <StackShell header={<StackBar title="Settings" />}>
      <div className="stk-pad">
        <p className="stk-label">Account</p>
        <div className="stk-card">
          <button className="stk-row press" type="button" onClick={() => navigate("/settings/profile")}>
            <span className="stk-ico">
              <span className="icon-box" style={{ width: 16, height: 16 }}>
                <img className="icon" src={publicUrl("/icons/row-profile.svg")} alt="" />
              </span>
            </span>
            Edit Profile
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
          <button className="stk-row press" type="button" onClick={() => navigate("/settings/bill")}>
            <span className="stk-ico">
              <span className="icon-box" style={{ width: 18, height: 20 }}>
                <img className="icon" src={publicUrl("/icons/row-bill.svg")} alt="" />
              </span>
            </span>
            Bill
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
        </div>

        <p className="stk-label">Legal</p>
        <div className="stk-card">
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/terms")}>
            Terms of Use
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/privacy")}>
            Privacy Policy
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/license")}>
            User License Agreement
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
        </div>

        <button className="stk-action press" type="button" onClick={() => openOverlay("confirmLogout")}>
          Log Out
        </button>
        <button className="stk-action danger press" type="button" onClick={() => openOverlay("confirmDelete")}>
          Delete Account
        </button>
        <p className="stk-ver">Version 2.1.4 (Build 890)</p>
      </div>
    </StackShell>
  );
}
