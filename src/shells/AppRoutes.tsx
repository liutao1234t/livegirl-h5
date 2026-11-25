import { LazyContent } from "./LazyContent";
import { lazy, type ReactNode } from "react";
import { Navigate, Route, Routes, type Location } from "react-router-dom";
import { SplashPage } from "../pages/SplashPage";
import { useAppStore } from "../store/appStore";

const AppleSupportPage = lazy(() => import("../pages/AppleSupportPage").then((m) => ({ default: m.AppleSupportPage })));
const BillPage = lazy(() => import("../pages/BillPage").then((m) => ({ default: m.BillPage })));
const IncomingCallPage = lazy(() => import("../pages/CallPages").then((m) => ({ default: m.IncomingCallPage })));
const InCallPage = lazy(() => import("../pages/CallPages").then((m) => ({ default: m.InCallPage })));
const OutgoingCallPage = lazy(() => import("../pages/CallPages").then((m) => ({ default: m.OutgoingCallPage })));
const ChatPage = lazy(() => import("../pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const CoinsPage = lazy(() => import("../pages/CoinsPage").then((m) => ({ default: m.CoinsPage })));
const EditProfilePage = lazy(() => import("../pages/EditProfilePage").then((m) => ({ default: m.EditProfilePage })));
const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const LiveHubPage = lazy(() => import("../pages/LiveHubPage").then((m) => ({ default: m.LiveHubPage })));
const LegalPage = lazy(() => import("../pages/LegalPage").then((m) => ({ default: m.LegalPage })));
const MePage = lazy(() => import("../pages/MePage").then((m) => ({ default: m.MePage })));
const MessagesPage = lazy(() => import("../pages/MessagesPage").then((m) => ({ default: m.MessagesPage })));
const ProfilePage = lazy(() => import("../pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const RankingPage = lazy(() => import("../pages/RankingPage").then((m) => ({ default: m.RankingPage })));
const ReelsPage = lazy(() => import("../pages/ReelsPage").then((m) => ({ default: m.ReelsPage })));
const ReportPage = lazy(() => import("../pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const SupportPage = lazy(() => import("../pages/SupportPage").then((m) => ({ default: m.SupportPage })));
const VipPage = lazy(() => import("../pages/VipPage").then((m) => ({ default: m.VipPage })));

function Gate({ children }: { children: ReactNode }) {
  const seenSplash = useAppStore((s) => s.seenSplash);
  if (!seenSplash) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes({ location }: { location: Location }) {
  return (
    <LazyContent>
      <Routes location={location}>
        <Route path="/" element={<SplashPage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
        <Route
          path="/app/home"
          element={
            <Gate>
              <HomePage />
            </Gate>
          }
        />
        <Route
          path="/app/reels"
          element={
            <Gate>
              <ReelsPage />
            </Gate>
          }
        />
        <Route
          path="/app/ranking"
          element={
            <Gate>
              <RankingPage />
            </Gate>
          }
        />
        <Route
          path="/app/messages"
          element={
            <Gate>
              <MessagesPage />
            </Gate>
          }
        />
        <Route
          path="/app/me"
          element={
            <Gate>
              <MePage />
            </Gate>
          }
        />
        <Route
          path="/live-hub/:username?"
          element={
            <Gate>
              <LiveHubPage />
            </Gate>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <Gate>
              <ProfilePage />
            </Gate>
          }
        />
        <Route
          path="/chat/:id"
          element={
            <Gate>
              <ChatPage />
            </Gate>
          }
        />
        <Route
          path="/call/outgoing/:id"
          element={
            <Gate>
              <OutgoingCallPage />
            </Gate>
          }
        />
        <Route
          path="/call/incoming/:id"
          element={
            <Gate>
              <IncomingCallPage />
            </Gate>
          }
        />
        <Route
          path="/call/in/:id"
          element={
            <Gate>
              <InCallPage />
            </Gate>
          }
        />
        <Route
          path="/settings"
          element={
            <Gate>
              <SettingsPage />
            </Gate>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <Gate>
              <EditProfilePage />
            </Gate>
          }
        />
        <Route
          path="/settings/bill"
          element={
            <Gate>
              <BillPage />
            </Gate>
          }
        />
        <Route
          path="/vip"
          element={
            <Gate>
              <VipPage />
            </Gate>
          }
        />
        <Route
          path="/coins"
          element={
            <Gate>
              <CoinsPage />
            </Gate>
          }
        />
        <Route
          path="/support"
          element={
            <Gate>
              <SupportPage />
            </Gate>
          }
        />
        <Route
          path="/apple-support"
          element={
            <Gate>
              <AppleSupportPage />
            </Gate>
          }
        />
        <Route
          path="/report/:id"
          element={
            <Gate>
              <ReportPage />
            </Gate>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LazyContent>
  );
}
