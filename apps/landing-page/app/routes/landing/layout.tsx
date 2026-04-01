import { Outlet } from "react-router";
import Footer from "@/components/Footer";

export type LandingLayoutContext = {
  isSearchVisible: boolean;
};

export default function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-(--layout-bg)">
      <main className="relative flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
