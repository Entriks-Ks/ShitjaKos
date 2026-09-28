"use client";

import { useState } from "react";
import styles from "./listing-facts.module.css";

type Row = { name: string; value: string };

export function ListingFacts({
  description,
  fields,
  extra,
  labels,
}: {
  description: string;
  fields: Row[];
  extra: Row[];
  labels: {
    description: string;
    additionalInfo: string;
    attribute: string;
    details: string;
    noAdditionalInfo: string;
  };
}) {
  const [tab, setTab] = useState<"description" | "extra">("description");
  return (
    <section className={styles.block}>
      <div className={styles.tabs} role="tablist" aria-label={labels.description}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "description"}
          className={styles.tab}
          onClick={() => setTab("description")}
        >
          {labels.description}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "extra"}
          className={styles.tab}
          onClick={() => setTab("extra")}
        >
          {labels.additionalInfo}
        </button>
      </div>
      {tab === "description" ? (
        <div className={`${styles.panel} ${styles.story}`} role="tabpanel">
          <p className={styles.text}>{description}</p>
          {fields.length > 0 && (
            <dl className={styles.facts}>
              {fields.map((row) => (
                <div key={row.name} className={styles.fact}>
                  <dt>{row.name}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ) : (
        <div className={styles.panel} role="tabpanel">
          {extra.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{labels.attribute}</th>
                  <th>{labels.details}</th>
                </tr>
              </thead>
              <tbody>
                {extra.map((row, index) => (
                  <tr key={`${index}-${row.name}`}>
                    <td>{row.name}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.empty}>{labels.noAdditionalInfo}</p>
          )}
        </div>
      )}
    </section>
  );
}
