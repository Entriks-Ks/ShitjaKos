"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import {
  finishRegistration,
  resendRegistrationCode,
  startRegistration,
} from "@/services/registration";

const email = z.email().max(254);
const registrationId = z.uuid();
const code = z.string().regex(/^\d{6}$/);

async function signedIn() {
  return Boolean(await getAuth().api.getSession({ headers: await headers() }));
}

export async function startRegistrationAction(input: {
  name: string;
  email: string;
  password: string;
}) {
  if (await signedIn()) return { error: "You are already signed in." };
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      email,
      password: z.string().min(12).max(128),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Enter a valid name, email, and password." };
  return startRegistration(parsed.data.name, parsed.data.email, parsed.data.password);
}

export async function finishRegistrationAction(input: {
  registrationId: string;
  email: string;
  code: string;
}) {
  if (await signedIn()) return { error: "You are already signed in." };
  const parsed = z.object({ registrationId, email, code }).safeParse(input);
  if (!parsed.success) return { error: "Enter your six-digit code." };
  return finishRegistration(
    parsed.data.registrationId,
    parsed.data.email,
    parsed.data.code,
  );
}

export async function resendRegistrationCodeAction(input: {
  registrationId: string;
  email: string;
}) {
  if (await signedIn()) return { error: "You are already signed in." };
  const parsed = z.object({ registrationId, email }).safeParse(input);
  if (!parsed.success) return { error: "Invalid registration request." };
  return resendRegistrationCode(parsed.data.registrationId, parsed.data.email);
}
