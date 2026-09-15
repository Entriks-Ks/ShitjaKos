import Link from "next/link";
export default function Page() {
  return (
    <main className="wrap py-20">
      <h1>This page is not available.</h1>
      <p className="muted mb-6">
        The listing may have been removed, sold, or is not public yet.
      </p>
      <Link className="btn btn-primary" href="/">
        Back to marketplace
      </Link>
    </main>
  );
}
