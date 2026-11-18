import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGirl } from "../data/girls";
import { formatInboxTime } from "../data/messages";
import { excludeCalled, isCalledGirl } from "../lib/calledHosts";
import { OfferGiftButton, TabShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { useHostsStore } from "../store/hostsStore";
import { useSayHiStore } from "../store/sayHiStore";
import { publicUrl } from "../lib/publicUrl";
import { t } from "../i18n";

export function MessagesPage() {
  const navigate = useNavigate();
  const threads = useAppStore((s) => s.threads);
  const unread = useAppStore((s) => s.unread);
  const inboxPeople = useAppStore((s) => s.inboxPeople);
  const calledGirlIds = useAppStore((s) => s.calledGirlIds);
  const hosts = useHostsStore((s) => s.hosts);
  const onlineNowIds = useSayHiStore((s) => s.onlineNowIds);
  const ensureOnlineNow = useSayHiStore((s) => s.ensureOnlineNow);
  const [q, setQ] = useState("");
  const visibleHosts = useMemo(() => excludeCalled(hosts, calledGirlIds), [hosts, calledGirlIds]);

  useEffect(() => {
    ensureOnlineNow(visibleHosts);
  }, [visibleHosts, ensureOnlineNow]);

  const onlineNow = useMemo(() => {
    const byId = new Map(visibleHosts.map((h) => [h.id, h]));
    return onlineNowIds
      .filter((id) => !isCalledGirl(id, calledGirlIds))
      .map((id) => byId.get(id) ?? getGirl(id))
      .filter((g, i, arr) => !isCalledGirl(g.id, calledGirlIds) && arr.findIndex((x) => x.id === g.id) === i);
  }, [visibleHosts, onlineNowIds, calledGirlIds]);

  const rows = useMemo(() => {
    return Object.entries(threads)
      .map(([id, thread]) => {
        if (isCalledGirl(id, calledGirlIds)) return null;
        const last = [...thread].reverse().find((m) => m.status !== "fail") ?? thread[thread.length - 1];
        if (!last) return null;
        const girl = getGirl(id);
        return {
          girl,
          preview: last.kind === "gift" ? t("gift.sent") : last.text,
          time: last.at ? formatInboxTime(last.at) : "",
          at: last.at ?? 0,
          unread: (unread[id] ?? 0) > 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.at - a.at);
  }, [threads, unread, inboxPeople, calledGirlIds]);

  const filtered = rows.filter((r) => r.girl.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <TabShell
      header={
        <header className="home-header">
          <h1 className="logo">{t("tab.messages")}</h1>
          <OfferGiftButton />
        </header>
      }
    >
      <label className="search-bar">
        <span className="icon-box" style={{ width: 18, height: 18 }}>
          <img className="icon" src={publicUrl("/icons/search.svg")} alt="" />
        </span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("messages.search")} />
      </label>

      <p className="section-kicker">{t("messages.onlineNow")}</p>
      <div className="online-row">
        {onlineNow.map((p) => (
          <button key={p.id} className="online-item press" type="button" onClick={() => navigate(`/profile/${p.id}`)}>
            <span className={`online-ring ${p.online ? "is-live" : ""}`}>
              <img src={p.avatar} alt="" />
              <span className={`online-dot ${p.online ? "" : "is-away"}`} />
            </span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="inbox-card official">
        <span className="official-icon">
          <span className="icon-box" style={{ width: 27, height: 22 }}>
            <img className="icon" src={publicUrl("/icons/megaphone.svg")} alt="" />
          </span>
        </span>
        <span className="inbox-body">
          <span className="inbox-top">
            <strong>{t("messages.official")}</strong>
            <time>{t("common.justNow")}</time>
          </span>
          <span className="inbox-preview">{t("messages.preview")}</span>
        </span>
      </div>

      <div className="inbox-list">
        {filtered.map((row) => (
          <div key={row.girl.id} className={`inbox-card ${row.unread ? "is-unread" : ""}`}>
            <button
              className="inbox-avatar press"
              type="button"
              aria-label={t("messages.profile", { name: row.girl.name })}
              onClick={() => navigate(`/profile/${row.girl.id}`)}
            >
              <img src={row.girl.avatar} alt="" />
              {row.girl.online ? <span className="online-dot" /> : null}
            </button>
            <button className="inbox-open press" type="button" onClick={() => navigate(`/chat/${row.girl.id}`)}>
              <span className="inbox-body">
                <span className="inbox-top">
                  <strong>{row.girl.name}</strong>
                  <time>{row.time}</time>
                </span>
                <span className="inbox-preview">{row.preview}</span>
              </span>
            </button>
            {row.unread ? <span className="unread-dot" /> : null}
          </div>
        ))}
      </div>
    </TabShell>
  );
}
