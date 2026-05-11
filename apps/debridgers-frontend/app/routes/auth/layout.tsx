import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="layout-max-width relative flex min-h-screen flex-col">
        <main className="relative flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
