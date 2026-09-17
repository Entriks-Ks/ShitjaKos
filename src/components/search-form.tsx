"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation-progress";

export function SearchForm({
  children,
  className,
  onSubmitted,
}: {
  children: ReactNode;
  className?: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Form
        action="/search"
        className={className}
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const params = new URLSearchParams();
          new FormData(event.currentTarget).forEach((value, name) => {
            if (typeof value === "string" && value.trim()) params.set(name, value.trim());
          });
          startTransition(() => {
            router.push(`/search?${params.toString()}`);
            onSubmitted?.();
          });
        }}
      >
        {children}
      </Form>
      <NavigationProgress pending={pending} />
    </>
  );
}
