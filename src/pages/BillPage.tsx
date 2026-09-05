import { useNavigate } from "react-router-dom";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { useAppStore } from "../store/appStore";
import { publicUrl } from "../lib/publicUrl";

export function BillPage() {
  const navigate = useNavigate();
  const coins = useAppStore((s) => s.coins);
  const bills = useAppStore((s) => s.bills);

  return (
    <StackShell header={<StackBar title="Bill" />}>
      <div className="stk-pad">
        <section className="bill-hero">
          <p>Current balance</p>
          <h2>
            {coins.toLocaleString()}
            <span className="icon-box" style={{ width: 25, height: 22 }}>
              <img className="icon" src={publicUrl("/images/coin.png")} alt="" />
            </span>
          </h2>
          <button className="bill-more press" type="button" onClick={() => navigate("/coins")}>
            <span className="icon-box" style={{ width: 9, height: 9 }}>
              <img className="icon" src={publicUrl("/icons/bill-plus.svg")} alt="" />
            </span>
            Get more
          </button>
        </section>
        {bills.map((row) => (
          <article key={row.id} className="bill-row">
            <span className="stk-ico lg">
              <span className="icon-box" style={{ width: 20, height: 20 }}>
                <img className="icon" src={row.kind === "in" ? publicUrl("/icons/bill-in.svg") : publicUrl("/icons/bill-call.svg")} alt="" />
              </span>
            </span>
            <span>
              <strong>{row.title}</strong>
              <small>{row.at}</small>
            </span>
            <b className={row.kind === "in" ? "in" : ""}>
              {row.amount > 0 ? "+" : ""}
              {row.amount}
              <img src={publicUrl("/images/coin.png")} alt="" />
            </b>
          </article>
        ))}
      </div>
    </StackShell>
  );
}
