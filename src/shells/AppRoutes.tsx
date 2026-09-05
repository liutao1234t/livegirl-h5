import type { ReactNode } from "react";
import { Navigate, Route, Routes, type Location } from "react-router-dom";
import { AppleSupportPage } from "../pages/AppleSupportPage";
import { BillPage } from "../pages/BillPage";
import { IncomingCallPage, InCallPage, OutgoingCallPage } from "../pages/CallPages";
import { ChatPage } from "../pages/ChatPage";
import { CoinsPage } from "../pages/CoinsPage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { HomePage } from "../pages/HomePage";
import { LegalPage } from "../pages/LegalPage";
import { MePage } from "../pages/MePage";
import { MessagesPage } from "../pages/MessagesPage";
import { ProfilePage } from "../pages/ProfilePage";
import { RankingPage } from "../pages/RankingPage";
import { ReelsPage } from "../pages/ReelsPage";
import { ReportPage } from "../pages/ReportPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SplashPage } from "../pages/SplashPage";
import { SupportPage } from "../pages/SupportPage";
import { VipPage } from "../pages/VipPage";
import { useAppStore } from "../store/appStore";

function Gate({ children }: { children: ReactNode }) {
  const seenSplash = useAppStore((s) => s.seenSplash);
  if (!seenSplash) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes({ location }: { location: Location }) {
  return (
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
  );
}
