"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { useTransition, useRef, useEffect, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { clear } from "console";


export function SearchForm({
  children,
  className,
  onSubmitted,
  autoSubmit = false,
}: {
  children: ReactNode;
  className?: string;
  onSubmitted?: () => void;
  autoSubmit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelScheduledSearch() {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  function search(form: HTMLFormElement) {
    if (!form.checkValidity()) return;

    const params = new URLSearchParams();

    new FormData(form).forEach((value, name) => {
      if (
        !name.startsWith("ui_") && name !== "page" && typeof value === "string" && value.trim()
      )
        params.set(name, value.trim());
    });

    const href = `/search?${params.toString()}`;

    startTransition(() => {
      if (autoSubmit) {
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
    })
  }

  return (
    <>
      <Form
        action="/search"
        className={className}
        aria-busy={pending}
        onChange={(event) => {
          if (!autoSubmit) return;

          const form = event.currentTarget;
          const target = event.target;

          if (
            !(target instanceof HTMLInputElement) &&
            !(target instanceof HTMLSelectElement)
          ) {
            return;
          }

          cancelScheduledSearch();

          // Range inputs submit when you leave the pair, not while typing.
          if (target.closest("[data-search-range]")) {
            return;
          }

          const isTyping =
            target instanceof HTMLInputElement &&
            ["number", "text", "search"].includes(target.type);

          timer.current = setTimeout(() => {
            timer.current = null;

            // Read after controlled inputs and their hidden values update.
            if (form.isConnected) {
              search(form);
            }
          }, isTyping ? 500 : 0);
        }}
        onSubmit={(event) => {
          event.preventDefault();

          if (!autoSubmit && pending) return;

          cancelScheduledSearch();
          search(event.currentTarget);
        }}
        onBlur={(event) => {
          if (!autoSubmit) return;

          const target = event.target;

          if (!(target instanceof HTMLInputElement)) return;

          const range = target.closest("[data-search-range]");

          if (!range) return;

          const nextTarget = event.relatedTarget;

          // Moving between From and To: keep editing without searching.
          if (nextTarget instanceof Node && range.contains(nextTarget)) {
            return;
          }

          const form = event.currentTarget;

          cancelScheduledSearch();

          // Allow a click on another filter to finish first.
          // Its onChange cancels this timer and submits everything together.
          timer.current = setTimeout(() => {
            timer.current = null;

            if (form.isConnected) {
              search(form);
            }
          }, 150);
        }}
      >

        {children}
      </Form >
      <NavigationProgress pending={pending} />
    </>
  );
}
