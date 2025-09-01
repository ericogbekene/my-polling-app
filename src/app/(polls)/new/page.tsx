import { getSession } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import CreatePollForm from "@/components/CreatePollForm";

export default async function NewPollPage() {
  const user = await getSession();
  if (!user) {
    redirect("/sign-in");
  }

  return <CreatePollForm />;
}


