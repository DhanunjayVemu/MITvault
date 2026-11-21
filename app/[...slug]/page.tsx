import HomeClient from "@/components/HomeClient";

// Catch all non-root paths so semester URLs can be served by the same client
// component. The root route remains app/page.tsx; a required catch-all avoids
// defining two routes for "/".
export default function Page() {
  return <HomeClient />;
}
