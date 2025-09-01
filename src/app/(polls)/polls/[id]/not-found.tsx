import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function PollNotFound() {
  return (
    <div className="mx-auto max-w-2xl w-full py-20 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4">Poll Not Found</h1>
      <p className="text-muted-foreground mb-8">
        The poll you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/polls">
          <Button>Browse Polls</Button>
        </Link>
        <Link href="/new">
          <Button variant="outline">Create Poll</Button>
        </Link>
      </div>
    </div>
  );
}
