import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Girl } from "../data/girls";
import { excludeCalled } from "../lib/calledHosts";
import { tryDial } from "../lib/paywall";
import { OfferGiftButton, TabShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { useHostsStore } from "../store/hostsStore";
import { publicUrl } from "../lib/publicUrl";

const cats = ["Hot", "New", "Sexy", "Cute"] as const;
const regions = ["Global", "America", "Europe", "Asia", "Africa", "Middle East"] as const;

function FitName({ name }: { name: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = 16;
    el.style.fontSize = `${size}px`;
    while (size > 11 && el.scrollWidth > el.clientWidth) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, [name]);

  return <h3 ref={ref}>{name}</h3>;
}

function Card({ girl, tall, onOpen, onCall }: { girl: Girl; tall?: boolean; onOpen: () => void; onCall: () => void }) {
  return (
    <article
      className={`girl-card ${tall ? "is-tall" : "is-short"}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      <img className="cover" src={girl.photo} alt="" />
      <div className="shade" />
      {girl.online ? (
        <div className="status-pill">
          <span className="dot" />
          Online
        </div>
      ) : null}
      <div className="meta">
        <FitName name={girl.name} />
        <p>
          <span className="icon-box" style={{ width: 10, height: 12 }}>
            <img className="icon" src={publicUrl("/icons/pin.svg")} alt="" />
          </span>
          <span>{girl.country}</span>
        </p>
      </div>
      <button
        className="fab-call press"
        type="button"
        aria-label={`Call ${girl.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onCall();
        }}
      >
        <span className="icon-box" style={{ width: 20, height: 16 }}>
          <img className="icon" src={publicUrl("/icons/video.svg")} alt="" />
        </span>
      </button>
    </article>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const hosts = useHostsStore((s) => s.hosts);
  const refreshHosts = useHostsStore((s) => s.refreshHosts);
  const calledGirlIds = useAppStore((s) => s.calledGirlIds);
  const [cat, setCat] = useState<(typeof cats)[number]>("Hot");
  const [region, setRegion] = useState<(typeof regions)[number]>("Global");

  useEffect(() => {
    void refreshHosts();
  }, [refreshHosts]);

  useEffect(() => {
    useAppStore.getState().offerWelcomeIfNeeded();
    useAppStore.getState().offerReward3IfDue();
  }, []);

  const feed = useMemo(() => {
    return excludeCalled(hosts, calledGirlIds).filter((g) => {
      const catOk = g.category === cat;
      const regionOk = region === "Global" || g.region === region;
      return catOk && regionOk;
    });
  }, [hosts, calledGirlIds, cat, region]);

  const cols = useMemo(() => {
    const left: { girl: Girl; tall: boolean }[] = [];
    const right: { girl: Girl; tall: boolean }[] = [];
    feed.forEach((girl, i) => {
      const item = { girl, tall: i % 4 === 1 || i % 4 === 2 };
      (i % 2 === 0 ? left : right).push(item);
    });
    return [left, right] as const;
  }, [feed]);

  return (
    <TabShell
      onRefresh={() => refreshHosts({ force: true })}
      header={
        <>
          <header className="home-header">
            <h1 className="logo">LiveGirl</h1>
            <OfferGiftButton />
          </header>
          <div className="chips">
            {cats.map((c) => (
              <button key={c} className={`chip press ${cat === c ? "is-on" : ""}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="regions">
            <span className="icon-box" style={{ width: 20, height: 20 }}>
              <img className="icon" src={publicUrl("/icons/filter.svg")} alt="" />
            </span>
            {regions.map((r) => (
              <button key={r} className={`region press ${region === r ? "is-on" : ""}`} onClick={() => setRegion(r)}>
                {r}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div className="masonry">
        {cols.map((col, colIdx) => (
          <div key={colIdx} className="masonry-col">
            {col.map(({ girl, tall }) => (
              <Card
                key={girl.id}
                girl={girl}
                tall={tall}
                onOpen={() => navigate(`/profile/${girl.id}`)}
                onCall={() => tryDial(girl.id, girl.ratePerMin, navigate)}
              />
            ))}
          </div>
        ))}
      </div>
    </TabShell>
  );
}
