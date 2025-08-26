import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewPollPage() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/sign-in");
  }
  return (
    <div className="mx-auto max-w-2xl w-full py-10">
      <h1 className="text-2xl font-semibold mb-6">Create a new poll</h1>
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="Which feature should we build next?" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Optional details..." />
        </div>
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="grid gap-2">
            <Input placeholder="Option 1" />
            <Input placeholder="Option 2" />
          </div>
        </div>
        <Button type="submit">Create poll</Button>
      </form>
    </div>
  );
}


