import { CoinPackGrid } from "./CoinPacks";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

export function CoinsPage() {
  const coins = useAppStore((s) => s.coins);

  return (
    <StackShell
      header={
        <StackBar
          title="COINS"
          align="start"
          right={
            <span className="coin-pill">
              <span className="icon-box" style={{ width: 20, height: 18 }}>
                <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
              </span>
              {coins.toLocaleString()}
            </span>
          }
        />
      }
    >
      <p className="coins-lead">
        Top up your balance to continue the
        <br />
        conversation.
      </p>
      <CoinPackGrid />
    </StackShell>
  );
}
