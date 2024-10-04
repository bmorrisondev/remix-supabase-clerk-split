import { getAuth } from "@clerk/remix/ssr.server";
import { redirect, type LoaderFunction, type MetaFunction, json, type ActionFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseClient } from "~/lib/clerkSupabaseUtils";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

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

  // Redirect or return a response
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

export default function Index() {
  const { data } = useLoaderData<typeof loader>()

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        <nav className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
          <h2>Tasks: </h2>
          <form action="/?index" method="post">
            <label>
              Name:
              <input type="text" name="name" />
            </label>
            <button type="submit">Submit</button>
          </form>

          <ul>
            {data.map((el: unknown) => (
              <li key={el.id}>{el.name}</li>
            ))}
          </ul>

          <h2>Raw data: </h2>
          {JSON.stringify(data)}
        </nav>
      </div>
    </div>
  );
}