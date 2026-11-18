import { CoinPackGrid } from "./CoinPacks";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";
import { formatCount, t } from "../i18n";

export function CoinsPage() {
  const coins = useAppStore((s) => s.coins);

  return (
    <StackShell
      header={
        <StackBar
          title={t("coins.word")}
          align="start"
          right={
            <span className="coin-pill">
              <span className="icon-box" style={{ width: 20, height: 18 }}>
                <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
              </span>
              {formatCount(coins)}
            </span>
          }
        />
      }
    >
      <p className="coins-lead">
        {t("coins.lead1")}
        <br />
        {t("coins.lead2")}
      </p>
      <CoinPackGrid />
    </StackShell>
  );
}
