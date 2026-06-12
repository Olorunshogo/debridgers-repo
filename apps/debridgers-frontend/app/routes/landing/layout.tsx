import { Outlet } from "react-router";
import Footer from "@/components/landing/Footer";

export type LandingLayoutContext = {
  isSearchVisible: boolean;
};

export default function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-layout-bg relative mx-auto flex h-full w-full flex-1 flex-col">
        <main className="relative mx-auto w-full flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
