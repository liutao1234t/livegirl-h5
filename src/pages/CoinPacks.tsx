import { coinsIap } from "../data/iap";
import { coinPacks, type CoinPack } from "../data/shop";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { t } from "../i18n";

export function CoinPackGrid() {
  const payBusy = useAppStore((s) => s.payBusy);
  const buyCoins = useAppStore((s) => s.buyCoins);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const shown = coinPacks.filter((p) => !p.hidden);
  const left = shown.filter((p) => p.col === 1);
  const right = shown.filter((p) => p.col === 2);

  const onBuy = (pack: CoinPack) => {
    if (payBusy) return;
    startPurchase(coinsIap(pack.slot), () => {
      buyCoins(pack.coins + (pack.bonus ?? 0), "Coins Added");
    });
  };

  return (
    <div className="pack-grid">
      <div className="pack-col">
        {left.map((p) => (
          <Pack key={p.id} pack={p} onBuy={() => onBuy(p)} />
        ))}
      </div>
      <div className="pack-col is-offset">
        {right.map((p) => (
          <Pack key={p.id} pack={p} onBuy={() => onBuy(p)} />
        ))}
      </div>
    </div>
  );
}

function Pack({ pack, onBuy }: { pack: CoinPack; onBuy: () => void }) {
  const cls = [
    "pack",
    "press",
    pack.glow ? "glow" : "",
    pack.glowLit ? "glow-lit" : "",
    pack.shine ? "shine" : "",
    pack.lg ? "lg" : "",
    pack.best ? "best" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} type="button" aria-label={t("coins.packAria", { n: pack.coins, price: pack.price })} onClick={onBuy}>
      {pack.id === "p5" ? <span className="pack-badge tone-wine">{t("coins.userTake", { n: 56 })}</span> : null}
      {pack.id === "p8" ? <span className="pack-badge tone-mid">{t("coins.userTake", { n: 22 })}</span> : null}
      {pack.best ? <span className="pack-best">{t("coins.best")}</span> : null}
      {pack.bonus ? <em>{t("coins.bonus", { n: pack.bonus })}</em> : null}
      <span className="icon-box pack-gem" style={{ width: 30, height: 27 }}>
        <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
      </span>
      <strong>{pack.coins}</strong>
      <small>{t("coins.word")}</small>
      <span className="pack-price">{pack.price}</span>
    </button>
  );
}
