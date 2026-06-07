import { Outlet } from "react-router";
import Footer from "@/components/landing/Footer";

export type LandingLayoutContext = {
  isSearchVisible: boolean;
};

export default function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="layout-max-width relative mx-auto flex h-full w-full flex-1 flex-col bg-(--layout-bg)">
        <main className="relative mx-auto w-full flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
