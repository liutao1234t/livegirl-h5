import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { isLegalDocId, LEGAL_DOCS } from "../lib/legal";
import { StackBar } from "../shells/StackBar";
import { StackShell } from "../shells/Shells";
import { t, type MessageKey } from "../i18n";

export function LegalPage() {
  const { doc } = useParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [doc]);

  if (!isLegalDocId(doc)) return <Navigate to="/" replace />;

  const titles: Record<typeof doc & string, MessageKey> = {
    terms: "settings.terms",
    privacy: "settings.privacy",
    license: "settings.license",
  };
  const title = t(titles[doc]);

  return (
    <StackShell header={<StackBar title={title} />}>
      <div className={`legal-doc${ready ? " is-ready" : ""}`}>
        {ready ? null : <span className="legal-doc-spin" aria-hidden />}
        <iframe
          key={doc}
          title={title}
          src={LEGAL_DOCS[doc].url}
          onLoad={() => setReady(true)}
        />
      </div>
    </StackShell>
  );
}
