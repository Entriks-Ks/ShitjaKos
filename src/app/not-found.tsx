import Image from "next/image";
import Link from "@/components/navigation-link";
import { ArrowUpRight, House } from "lucide-react";
import styles from "./not-found.module.css";

export default function Page() {
  return (
    <main className={styles.page}>
      <Image
        className={styles.artwork}
        src="/illustrations/not-found.svg"
        width={560}
        height={332}
        alt="404"
        unoptimized
        loading="eager"
      />
      <h1>Faqja nuk u gjet</h1>
      <p className={styles.description}>
        Lidhja mund të ketë ndryshuar, ose faqja nuk është më e disponueshme. Ka ende
        shumë gjëra të mira për të zbuluar.
      </p>
      <div className={styles.actions}>
        <Link className={styles.primary} href="/">
          <House size={18} aria-hidden="true" />
          Kthehu në ballinë
        </Link>
        <Link className={styles.secondary} href="/search">
          <ArrowUpRight size={20} aria-hidden="true" />
          Shfleto shpalljet
        </Link>
      </div>
    </main>
  );
}
