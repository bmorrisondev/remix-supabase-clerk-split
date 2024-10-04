# Clerk x Supabase x Remix - Split `getToken` between client and server

This repo was built to help eliminate rate limits when using `getToken` specifically on the server. Using `getToken` from the client is not rate limited and should not encounter the same issues.

## The solution

The solution proposed is to use a custom React hook that will request a token client-side when the page loads and store that as a cookie in the browser. Whenever the session is renewed, a new token will be requested to replace the expired one, keeping the token up to date.

Cookies were chosen as they are sent to the server by default, where they can be parsed and used when creating the Supabase client.

## How it works

The `app/lib/clerkSupabaseUtils.ts` file contains two exports:

- `useClerkSupabaseTokenAsCookie` is a React hook that continously keeps the client-side token up to date and stores it in a browser cookie.
- `createSupabaseClient` is function tailed to Remix Loaders and Actions that will parse the request arguments to use the cookie if present.

In order to cover all routes, the `useClerkSupabaseTokenAsCookie` is set in `app/root.tsx` in the `App()` function:

```tsx
// app/root.tsx
function App() {
  useClerkSupabaseTokenAsCookie()

  return <Outlet />
}
```

Whenever Supabase is being accessed from an Action or Loader, simply use it and pass in the `args` from either one and it will use the provided cookie with requests to Supabase, or request a new one if it's not present:

```tsx
// app/routes/_index.tsx
export const action: ActionFunction = async (args) => {
  const { request } = args

  // Parse the form data
  const formData = await request.formData();
  const name = formData.get("name");

  // Validate the form field
  if (typeof name !== "string" || name.trim() === "") {
    return json({ error: "'name' is required" }, { status: 400 });
  }

  // Perform any operations with the parsed data
  const client = await createSupabaseClient(args)
  await client.from("tasks").insert({ name })

  return {}
};

export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect("/sign-in");
  }

  const client = await createSupabaseClient(args)
  const { data, error } = await client.from('tasks').select()

  return {
    data, error
  }
}
```


## Potential issues

I encountered exactly one instance where the cookie was not sent to the server, so a fallback of using `getToken` on the server is built into `app/lib/clerkSupabaseUtils.ts:createSupabaseClient()` so even if a token is not present in the cookies, the function will still request one from Clerk.
