"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/polls", label: "Polls" },
  { href: "/new", label: "New Poll" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto max-w-6xl w-full h-14 flex items-center justify-between px-4">
        <nav className="flex items-center gap-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm",
                pathname === l.href ? "font-semibold" : "text-foreground/80"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <Link href="/sign-in">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Sign up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}


