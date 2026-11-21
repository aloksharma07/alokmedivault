import { createFileRoute } from "@tanstack/react-router";
import { AdminUserDetailsPage } from "@/components/medivault-pages";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  head: () => pageHead("User account details", "Review an account profile and recent activity."),
  component: UserDetailsRoute,
});

function UserDetailsRoute() {
  const { userId } = Route.useParams();
  return <AdminUserDetailsPage userId={userId} />;
}