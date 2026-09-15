"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="wrap py-20">
      <h1>We couldn’t load this page.</h1>
      <p className="muted mb-6">
        Please try again. If you are setting up locally, check that the database is
        running and migrations have been applied.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
