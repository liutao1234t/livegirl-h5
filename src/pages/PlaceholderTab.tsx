import { useNavigate } from "react-router-dom";
import { TabShell } from "../shells/Shells";

export function PlaceholderTab({ title, hint }: { title: string; hint: string }) {
  const navigate = useNavigate();
  return (
    <TabShell
      header={
        <header className="home-header">
          <h1 className="logo" style={{ fontStyle: "italic" }}>
            {title}
          </h1>
        </header>
      }
    >
      <div className="placeholder-tab">
        <h2>Coming next</h2>
        <p>{hint}</p>
        {title === "Messages" ? (
          <button className="btn-primary press" style={{ marginTop: 24 }} onClick={() => navigate("/chat/isabella")}>
            Open Isabella chat
          </button>
        ) : null}
      </div>
    </TabShell>
  );
}
