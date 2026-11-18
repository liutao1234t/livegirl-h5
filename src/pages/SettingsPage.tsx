import { useNavigate } from "react-router-dom";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { LOCALE_NAMES, LOCALES, t, useActiveLocale, useLocaleStore, type Locale } from "../i18n";

export function SettingsPage() {
  const navigate = useNavigate();
  const openOverlay = useAppStore((s) => s.openOverlay);
  const uiLocale = useActiveLocale();
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <StackShell header={<StackBar title={t("settings.title")} />}>
      <div className="stk-pad">
        <div className="stk-card">
          <label className="stk-row lang-pick">
            <span>{t("settings.language")}</span>
            <span className="lang-pick-value">{LOCALE_NAMES[uiLocale]}</span>
            <span className="icon-box chevron" aria-hidden="true" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
            <select
              className="lang-select"
              value={uiLocale}
              aria-label={t("settings.language")}
              onChange={(e) => {
                const next = e.target.value as Locale;
                if ((LOCALES as readonly string[]).includes(next)) setLocale(next);
              }}
            >
              {LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_NAMES[code]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="stk-label">{t("settings.account")}</p>
        <div className="stk-card">
          <button className="stk-row press" type="button" onClick={() => navigate("/settings/profile")}>
            <span className="stk-ico">
              <span className="icon-box" style={{ width: 16, height: 16 }}>
                <img className="icon" src={publicUrl("/icons/row-profile.svg")} alt="" />
              </span>
            </span>
            {t("settings.editProfile")}
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
            {t("settings.bill")}
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
        </div>

        <p className="stk-label">{t("settings.legal")}</p>
        <div className="stk-card">
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/terms")}>
            {t("settings.terms")}
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/privacy")}>
            {t("settings.privacy")}
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
          <button className="stk-row press" type="button" onClick={() => navigate("/legal/license")}>
            {t("settings.license")}
            <span className="icon-box chevron" style={{ width: 8, height: 12 }}>
              <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
            </span>
          </button>
        </div>

        <button className="stk-action press" type="button" onClick={() => openOverlay("confirmLogout")}>
          {t("settings.logout")}
        </button>
        <button className="stk-action danger press" type="button" onClick={() => openOverlay("confirmDelete")}>
          {t("settings.delete")}
        </button>
        <p className="stk-ver">{t("settings.version")}</p>
      </div>
    </StackShell>
  );
}
