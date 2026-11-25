import { Component, Suspense, type ReactNode } from "react";
import { t } from "../i18n";

class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      // Reload also recovers stale chunk URLs after a deployment.
      return <div className="route-loading"><button className="btn-primary press" onClick={() => window.location.reload()}>{t("common.tryAgain")}</button></div>;
    }
    return this.props.children;
  }
}

export function LazyContent({ children }: { children: ReactNode }) {
  return (
    <LoadBoundary>
      <Suspense fallback={<div className="route-loading" role="status" aria-label={t("common.loading")}><span className="ptr-spinner is-on" /></div>}>
        {children}
      </Suspense>
    </LoadBoundary>
  );
}
