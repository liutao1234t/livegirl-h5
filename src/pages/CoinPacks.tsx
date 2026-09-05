import { coinsIap } from "../data/iap";
import { coinPacks, type CoinPack } from "../data/shop";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

export function CoinPackGrid() {
  const payBusy = useAppStore((s) => s.payBusy);
  const buyCoins = useAppStore((s) => s.buyCoins);
  const startPurchase = useAppStore((s) => s.startPurchase);
  const left = coinPacks.filter((p) => p.col === 1);
  const right = coinPacks.filter((p) => p.col === 2);

  const onBuy = (pack: CoinPack) => {
    if (payBusy) return;
    startPurchase(coinsIap(pack.productId), () => {
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
    <button className={cls} type="button" aria-label={`${pack.coins} coins, ${pack.price}`} onClick={onBuy}>
      {pack.badge ? <span className={`pack-badge tone-${pack.badgeTone ?? "wine"}`}>{pack.badge}</span> : null}
      {pack.best ? <span className="pack-best">SAVE BEST</span> : null}
      {pack.bonus ? <em>+{pack.bonus} Bonus</em> : null}
      <span className="icon-box pack-gem" style={{ width: 30, height: 27 }}>
        <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
      </span>
      <strong>{pack.coins}</strong>
      <small>COINS</small>
      <span className="pack-price">{pack.price}</span>
    </button>
  );
}
