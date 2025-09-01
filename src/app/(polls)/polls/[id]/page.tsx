import { Button } from "@/components/ui/button";
import { getPoll } from "@/lib/actions/polls";
import { getSession } from "@/lib/supabase/session";
import { Calendar, Clock, Share2, Vote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import PollVoteForm from "@/components/PollVoteForm";

interface PollPageProps {
  params: {
    id: string;
  };
}

export default async function PollPage({ params }: PollPageProps) {
  const user = await getSession();
  const poll = await getPoll(params.id);

  if (!poll) {
    notFound();
  }

  const totalVotes = poll.poll_options?.reduce(
    (sum, option) => sum + (option.votes?.[0]?.count || 0),
    0
  ) || 0;

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const isActive = poll.is_active && !isExpired;

  return (
    <div className="mx-auto max-w-4xl w-full py-10">
      {/* Poll Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground text-lg mb-4">
                {poll.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {user?.id === poll.created_by && (
              <Link href={`/polls/${poll.id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Poll Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Vote className="h-4 w-4 text-muted-foreground" />
            <span>{totalVotes} votes</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Created {new Date(poll.created_at).toLocaleDateString()}</span>
          </div>
          {poll.expires_at && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                Expires {new Date(poll.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {isActive ? "Active" : "Closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Poll Content */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Voting Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Cast Your Vote</h2>
          {isActive ? (
            <PollVoteForm poll={poll} user={user} />
          ) : (
            <div className="text-center py-8">
              <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Voting Closed</h3>
              <p className="text-muted-foreground">
                This poll is no longer accepting votes.
              </p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="space-y-3">
            {poll.poll_options?.map((option) => {
              const voteCount = option.votes?.[0]?.count || 0;
              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

              return (
                <div key={option.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{option.text}</span>
                    <span className="text-muted-foreground">
                      {voteCount} votes ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {totalVotes === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No votes yet. Be the first to vote!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
