import { getAuth } from "@clerk/remix/ssr.server"
import { LoaderFunctionArgs } from "@remix-run/node"
import { createClient } from "@supabase/supabase-js"
import { useEffect } from "react";
import { useSession } from "@clerk/remix";

const COOKIE_NAME = '__supabaseClerkToken'

function parseCookies(cookieHeader: string): {[key: string]:string} {
  const cookies: {[key: string]:string} = {}
  const kvps = cookieHeader.split("; ")
  kvps.forEach(kvp => {
    const split = kvp.split("=")
    cookies[split[0]] = split[1]
  })
  return cookies
}

export async function createSupabaseClient(args: LoaderFunctionArgs) {
  const { getToken } = await getAuth(args);
  let clerkToken: string | null = null

  const cookieHeader = args.request.headers.get("Cookie");
  if(cookieHeader) {
    const cookies = parseCookies(cookieHeader)
    clerkToken = cookies[COOKIE_NAME]
    if(!clerkToken) {
      clerkToken = await getToken({
        template: 'supabase',
      })
    }
  }

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    {
      global: {
        // Get the custom Supabase token from Clerk
        fetch: async (url: string | URL | Request, options = {}) => {
          // Insert the Clerk Supabase token into the headers
          const headers = new Headers(options?.headers)
          headers.set('Authorization', `Bearer ${clerkToken}`)

          // Now call the default fetch
          return fetch(url, {
            ...options,
            headers,
          })
        },
      },
    },
  )
}

export function useClerkSupabaseTokenAsCookie() {
  const { session } = useSession()

  useEffect(() => {
    async function setTokenCookie() {
      function parseJwt(token: string) {
        try {
          // Split the token into its parts
          const base64Url = token.split('.')[1];
          // Decode the base64 URL-encoded string
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          // Parse the JSON payload
          return JSON.parse(jsonPayload);
        } catch (e) {
          console.error('Invalid JWT token', e);
          return null;
        }
      }

      function formatCookieExpiration(epochTimestamp: number) {
        // Create a Date object from the epoch timestamp
        const date = new Date(epochTimestamp * 1000); // Convert seconds to milliseconds

        // Define an array of weekday and month names
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Format the date components
        const dayOfWeek = weekdays[date.getUTCDay()];
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = months[date.getUTCMonth()];
        const year = date.getUTCFullYear();
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        // Construct the formatted date string
        return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
      }

      const clerkToken = await session?.getToken({
        template: 'supabase',
      })

      if(clerkToken) {
        const parsed = parseJwt(clerkToken)
        const expiration = formatCookieExpiration(parsed["exp"])
        document.cookie = `${COOKIE_NAME}=${clerkToken}; expires=${expiration}; path=/`
      }
    }
    setTokenCookie()
  }, [session])
}