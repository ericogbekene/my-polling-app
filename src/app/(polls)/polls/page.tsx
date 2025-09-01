import { Button } from "@/components/ui/button";
import { getPublicPolls } from "@/lib/actions/polls";
import { getSession } from "@/lib/supabase/session";
import { Calendar, Clock, Users, Vote, CheckCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function PollsPage({
  searchParams,
}: {
  searchParams: { created?: string };
}) {
  const user = await getSession();
  if (!user) {
    redirect("/sign-in");
  }

  const polls = await getPublicPolls();

  return (
    <div className="mx-auto max-w-4xl w-full py-10">
      {searchParams.created === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Success!</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            Your poll has been created successfully and is now live.
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">All Polls</h1>
          <p className="text-muted-foreground">
            Browse and vote on polls created by the community.
          </p>
        </div>
        <Link href="/new">
          <Button>Create Poll</Button>
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-12">
          <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No polls yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a poll!
          </p>
          <Link href="/new">
            <Button>Create Your First Poll</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => {
            const totalVotes = poll.poll_options?.reduce(
              (sum, option) => sum + (option.votes?.[0]?.count || 0),
              0
            ) || 0;

            const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

            return (
              <Link
                key={poll.id}
                href={`/polls/${poll.id}`}
                className="block group"
              >
                <div className="border rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {poll.title}
                    </h3>
                    {isExpired && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        Expired
                      </span>
                    )}
                  </div>

                  {poll.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {poll.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{poll.poll_options?.length || 0} options</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Vote className="h-4 w-4" />
                      <span>{totalVotes} votes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(poll.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {poll.expires_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Expires {new Date(poll.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


