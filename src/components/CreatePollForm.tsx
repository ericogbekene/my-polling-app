'use client';

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPoll } from "@/lib/actions/polls";
import { Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CreatePollForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [options, setOptions] = useState(['', '']); // Start with 2 empty options
  const router = useRouter();

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    
    startTransition(async () => {
      try {
        // Add options to form data
        options.forEach((option, index) => {
          if (option.trim()) {
            formData.append('options', option);
          }
        });

        const result = await createPoll(formData);
        
        if (result?.success) {
          // Show success message briefly before redirecting
          setSuccess(true);
          setTimeout(() => {
            router.push('/polls?created=true');
          }, 1500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl w-full py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create a New Poll</h1>
        <p className="text-muted-foreground">
          Create a poll and share it with others to get their votes.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <X className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Check className="h-4 w-4" />
            // The <Check /> component is an icon from the "lucide-react" icon library.
            // To ensure it is properly defined and imported, check the top of this file for:
            //   import { Check } from "lucide-react";
            // If this import is present, <Check /> is properly defined and can be used as a React component.
            // If not, add the import statement at the top of the file.
            <span className="font-medium">Success!</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            Poll created successfully! Redirecting to polls page...
          </p>
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        {/* Poll Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-base font-medium">
            Poll Title *
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g., Which feature should we build next?"
            required
            className="text-base"
          />
        </div>

        {/* Poll Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Optional details about your poll..."
            rows={3}
            className="text-base"
          />
        </div>

        {/* Poll Options */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Poll Options *
          </Label>
          <p className="text-sm text-muted-foreground">
            Add at least 2 options for people to vote on.
          </p>
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  name="options"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  required={index < 2}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>

        {/* Poll Settings */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Poll Settings</Label>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Expiration Date */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="text-sm font-medium">
                Expiration Date
              </Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>

            {/* Multiple Votes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Voting Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="allowMultipleVotes"
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Allow multiple votes per person</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="requireAuthToVote"
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Require authentication to vote</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending || success}
            className="flex-1"
          >
            Cancel
          </Button>
                    <Button
            type="submit"
            disabled={isPending || success}
            className="flex-1"
          >
            {isPending ? 'Creating...' : success ? 'Created!' : 'Create Poll'}
          </Button>
        </div>
      </form>
    </div>
  );
}
