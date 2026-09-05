import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Girl } from "../data/girls";
import { formatHeat, rankHosts, type RankTab } from "../data/ranking";
import { excludeCalled } from "../lib/calledHosts";
import { OfferGiftButton, TabShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { useHostsStore } from "../store/hostsStore";
import { publicUrl } from "../lib/publicUrl";

function PodiumCard({
  girl,
  place,
  onOpen,
}: {
  girl: Girl;
  place: 1 | 2 | 3;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={`podium-card place-${place} press`} onClick={onOpen}>
      <span className="podium-photo">
        <img src={girl.photo} alt="" />
        <span className="podium-fade">
          <span className="podium-name">{girl.name}</span>
          {girl.online ? <span className="dot" /> : null}
        </span>
      </span>
      {place === 1 ? (
        <span className="podium-crown">
          <img className="icon" src={publicUrl("/icons/crown.svg")} alt="" />
        </span>
      ) : null}
      <span className={`podium-badge place-${place}`}>{place}</span>
    </button>
  );
}

export function RankingPage() {
  const navigate = useNavigate();
  const hosts = useHostsStore((s) => s.hosts);
  const refreshHosts = useHostsStore((s) => s.refreshHosts);
  const calledGirlIds = useAppStore((s) => s.calledGirlIds);
  const [tab, setTab] = useState<RankTab>("Daily");

  useEffect(() => {
    void refreshHosts();
  }, [refreshHosts]);

  const ranks = useMemo(() => rankHosts(excludeCalled(hosts, calledGirlIds), tab), [hosts, calledGirlIds, tab]);
  const first = ranks[0];
  const second = ranks[1];
  const third = ranks[2];
  const rest = ranks.slice(3);

  return (
    <TabShell
      onRefresh={() => refreshHosts({ force: true })}
      header={
        <header className="home-header">
          <h1 className="logo">Ranking</h1>
          <OfferGiftButton />
        </header>
      }
    >
      <div className="rank-switch">
        {(["Daily", "Weekly"] as const).map((t) => (
          <button key={t} className={`press ${tab === t ? "is-on" : ""}`} type="button" onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {ranks.length === 0 ? (
        <p className="rank-empty">No ranking yet</p>
      ) : (
        <>
          <div className="podium">
            <img className="podium-glow" src={publicUrl("/images/podium-glow.svg")} alt="" />
            {second ? <PodiumCard girl={second} place={2} onOpen={() => navigate(`/profile/${second.id}`)} /> : null}
            {first ? <PodiumCard girl={first} place={1} onOpen={() => navigate(`/profile/${first.id}`)} /> : null}
            {third ? <PodiumCard girl={third} place={3} onOpen={() => navigate(`/profile/${third.id}`)} /> : null}
          </div>

          <div className="rank-list">
            {rest.map((girl, i) => (
              <button key={girl.id} className="rank-row press" type="button" onClick={() => navigate(`/profile/${girl.id}`)}>
                <span className="rank-n">{i + 4}</span>
                <span className="rank-avatar">
                  <img src={girl.photo} alt="" />
                  {girl.online ? <span className="dot" /> : null}
                </span>
                <span className="rank-meta">
                  <strong>{girl.name}</strong>
                  <small>{girl.country}</small>
                </span>
                <span className="heat">
                  <span className="icon-box" style={{ width: 11, height: 12 }}>
                    <img className="icon" src={publicUrl("/icons/flame.svg")} alt="" />
                  </span>
                  {formatHeat(girl.fireCount ?? 0)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </TabShell>
  );
}
