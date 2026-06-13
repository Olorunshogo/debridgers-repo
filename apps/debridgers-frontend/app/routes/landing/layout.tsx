import { Outlet } from "react-router";
import Footer from "@/components/landing/Footer";

export type LandingLayoutContext = {
  isSearchVisible: boolean;
};

export default function LandingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="relative flex h-full w-full flex-1 flex-col">
        <main className="relative w-full flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
