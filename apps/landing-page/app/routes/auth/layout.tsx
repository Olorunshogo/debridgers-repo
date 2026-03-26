import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-(--layout-bg)">
      <main className="relative flex-1">
        <Outlet />
      </main>
    </div>
  );
}
