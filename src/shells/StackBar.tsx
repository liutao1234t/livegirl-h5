import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { publicUrl } from "../lib/publicUrl";

export function StackBar({
  title,
  right,
  align = "center",
}: {
  title: string;
  right?: ReactNode;
  align?: "center" | "start";
}) {
  const navigate = useNavigate();
  return (
    <header className={`stack-bar ${align === "start" ? "is-start" : ""}`}>
      <button className="circle-btn press" type="button" aria-label="Back" onClick={() => navigate(-1)}>
        <span className="icon-box" style={{ width: 16, height: 16 }}>
          <img className="icon" src={publicUrl("/icons/back.svg")} alt="" />
        </span>
      </button>
      <h1>{title}</h1>
      <div className="stack-bar-right">{right}</div>
    </header>
  );
}
