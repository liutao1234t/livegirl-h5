import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { t } from "../i18n";

export function EditProfilePage() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const saveProfile = useAppStore((s) => s.saveProfile);
  const [nick, setNick] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio);

  const onSave = (e?: FormEvent) => {
    e?.preventDefault();
    saveProfile({ ...profile, nickname: nick.trim() || profile.nickname, bio });
    navigate(-1);
  };

  return (
    <StackShell
      header={
        <StackBar
          title={t("edit.title")}
          right={
            <button className="stack-save press" type="button" onClick={() => onSave()}>
              {t("common.save")}
            </button>
          }
        />
      }
    >
      <form className="stk-pad edit-form" onSubmit={onSave}>
        <button className="edit-ava-block press" type="button">
          <span className="edit-ava">
            <img className="edit-ava-photo" src={publicUrl("/images/me-avatar.png")} alt="" />
            <span className="edit-cam">
              <img className="edit-cam-icon" src={publicUrl("/icons/camera.svg")} alt="" />
            </span>
          </span>
          <span className="edit-change">{t("edit.changePhoto")}</span>
        </button>

        <label className="edit-block">
          {t("edit.nickname")}
          <span className="edit-field">
            <input value={nick} onChange={(e) => setNick(e.target.value)} />
            <span className="icon-box" style={{ width: 23, height: 15 }}>
              <img className="icon" src={publicUrl("/icons/pencil.svg")} alt="" />
            </span>
          </span>
        </label>
        <label className="edit-block">
          {t("edit.about")}
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </label>
        <div className="stk-card rounder edit-info">
          <button className="stk-row press" type="button">
            {t("edit.gender")}
            <span className="stk-meta">
              {profile.gender}
              <span className="icon-box" style={{ width: 8, height: 12 }}>
                <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
              </span>
            </span>
          </button>
          <button className="stk-row press" type="button">
            {t("edit.birthday")}
            <span className="stk-meta">
              {profile.birthday}
              <span className="icon-box" style={{ width: 8, height: 12 }}>
                <img className="icon" src={publicUrl("/icons/chevron.svg")} alt="" />
              </span>
            </span>
          </button>
        </div>
      </form>
    </StackShell>
  );
}
