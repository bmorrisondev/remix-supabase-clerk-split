import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

// Import rootAuthLoader
import { rootAuthLoader } from "@clerk/remix/ssr.server";
// Import ClerkApp
import { ClerkApp } from '@clerk/remix'
import { useClerkSupabaseTokenAsCookie } from "./lib/clerkSupabaseUtils";

export const meta: MetaFunction = () => ([{
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
}]);

// Export as the root route loader
export const loader: LoaderFunction = (args) => rootAuthLoader(args);

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function App() {
  useClerkSupabaseTokenAsCookie()

  return <Outlet />
}

export default ClerkApp(App)