'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitVote } from "@/lib/actions/votes";
import { Poll, User } from "@/lib/types/database";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface PollVoteFormProps {
  poll: Poll & {
    poll_options?: Array<{
      id: string;
      text: string;
      votes?: Array<{ count: number }>;
    }>;
  };
  user: User | null;
}

export default function PollVoteForm({ poll, user }: PollVoteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voterEmail, setVoterEmail] = useState('');
  const [voterName, setVoterName] = useState('');
  const router = useRouter();

  const handleOptionToggle = (optionId: string) => {
    if (poll.allow_multiple_votes) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (selectedOptions.length === 0) {
      setError('Please select at least one option');
      return;
    }

    if (!poll.allow_multiple_votes && selectedOptions.length > 1) {
      setError('This poll only allows one vote per person');
      return;
    }

    if (!user && poll.require_auth_to_vote) {
      setError('This poll requires authentication to vote');
      return;
    }

    if (!user && !voterEmail.trim()) {
      setError('Please provide your email address');
      return;
    }

    startTransition(async () => {
      try {
        // Submit votes for all selected options
        for (const optionId of selectedOptions) {
          await submitVote({
            poll_id: poll.id,
            option_id: optionId,
            voter_email: user ? undefined : voterEmail.trim(),
            voter_name: user ? undefined : voterName.trim(),
          });
        }

        setSuccess(true);
        // Refresh the page to show updated results
        setTimeout(() => {
          router.refresh();
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit vote');
      }
    });
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium mb-2">Vote Submitted!</h3>
        <p className="text-muted-foreground">
          Thank you for voting. The results will update shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <X className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {/* Anonymous voter info */}
      {!user && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium">Your Information</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voterEmail">Email *</Label>
              <Input
                id="voterEmail"
                type="email"
                value={voterEmail}
                onChange={(e) => setVoterEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voterName">Name (optional)</Label>
              <Input
                id="voterName"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
        </div>
      )}

      {/* Voting Options */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Select {poll.allow_multiple_votes ? 'your options' : 'an option'}:
        </Label>
        
        <div className="space-y-2">
          {poll.poll_options?.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedOptions.includes(option.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type={poll.allow_multiple_votes ? 'checkbox' : 'radio'}
                name="vote"
                value={option.id}
                checked={selectedOptions.includes(option.id)}
                onChange={() => handleOptionToggle(option.id)}
                className="mr-3"
              />
              <span className="flex-1">{option.text}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending || selectedOptions.length === 0}
        className="w-full"
      >
        {isPending ? 'Submitting...' : 'Submit Vote'}
      </Button>

      {/* Poll Settings Info */}
      <div className="text-sm text-muted-foreground space-y-1">
        {poll.allow_multiple_votes && (
          <p>• You can select multiple options</p>
        )}
        {poll.require_auth_to_vote && (
          <p>• Authentication required to vote</p>
        )}
        {poll.expires_at && (
          <p>• Poll expires on {new Date(poll.expires_at).toLocaleDateString()}</p>
        )}
      </div>
    </form>
  );
}
