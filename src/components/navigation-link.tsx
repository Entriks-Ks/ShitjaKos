"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { NavigationProgress } from "@/components/navigation-progress";

function LinkProgress() {
  const { pending } = useLinkStatus();
  return <NavigationProgress pending={pending} />;
}

export default function NavigationLink({
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <LinkProgress />
    </NextLink>
  );
}
