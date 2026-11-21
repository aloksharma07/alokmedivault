import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/doctor/qr-access")({
  component: () => <Outlet />,
});