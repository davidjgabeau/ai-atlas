import { redirect } from "next/navigation";

export default async function NewsfeedAliasPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params?.view ? `?view=${encodeURIComponent(params.view)}` : "";

  redirect(`/feed${view}`);
}
