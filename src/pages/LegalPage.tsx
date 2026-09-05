import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { isLegalDocId, LEGAL_DOCS } from "../lib/legal";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";

export function LegalPage() {
  const { doc } = useParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [doc]);

  if (!isLegalDocId(doc)) return <Navigate to="/" replace />;

  const meta = LEGAL_DOCS[doc];

  return (
    <StackShell header={<StackBar title={meta.title} />}>
      <div className={`legal-doc${ready ? " is-ready" : ""}`}>
        {ready ? null : <span className="legal-doc-spin" aria-hidden />}
        <iframe
          key={doc}
          title={meta.title}
          src={meta.url}
          onLoad={() => setReady(true)}
        />
      </div>
    </StackShell>
  );
}
