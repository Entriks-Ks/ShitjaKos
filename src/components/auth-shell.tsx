import Image from "next/image";
import Link from "@/components/navigation-link";
import { ArrowLeft, Lock } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-screen">
      <div className="auth-split">
        <div className="auth-split-photo">
          <Image
            src="/images/ideaaa.jpg"
            alt="Open box of clothing, bags, and accessories"
            fill
            preload
            unoptimized
            sizes="(max-width: 860px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="auth-split-panel">
          <Link href="/" className="auth-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
          <div className="auth-split-body">
            {children}
            <p className="auth-secure">
              <Lock size={12} aria-hidden="true" />
              This connection is secure.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
