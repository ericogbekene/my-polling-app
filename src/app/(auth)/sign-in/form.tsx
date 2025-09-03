"use client";

import { useFormState } from "react-dom";
import {useActionState} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type AuthState } from "../actions";

const initialState: AuthState = {};

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, initialState);
  return (
    <form className="space-y-4" action={formAction}>
      {state?.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
      <Button type="submit" className="w-full">Continue</Button>
    </form>
  );
}


