"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { NavigationProgress } from "@/components/navigation-progress";
import { searchUrl, type SearchParams } from "@/lib/search-navigation";
import type { Locale } from "@/lib/catalog";

const labels = {
    sq: {
        label: "Renditja",
        newest: "Më të rejat",
        oldest: "Më të vjetrat",
        lowest: "Çmimi më i ulët",
        highest: "Çmimi më i lartë",
    },
    en: {
        label: "Sort by",
        newest: "Newest first",
        oldest: "Oldest first",
        lowest: "Lowest price",
        highest: "Highest price",
    },
    de: {
        label: "Sortieren",
        newest: "Neueste zuerst",
        oldest: "Älteste zuerst",
        lowest: "Niedrigster Preis",
        highest: "Höchster Preis",
    },
};

export function SearchSort({
    params,
    locale,
}: {
    params: SearchParams;
    locale: Locale;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const t = labels[locale];

    const options = [
        { value: "newest", label: t.newest },
        { value: "oldest", label: t.oldest },
        { value: "price-asc", label: t.lowest },
        { value: "price-desc", label: t.highest },
    ];

    const selected = options.some((option) => option.value === params.sort)
        ? params.sort
        : "newest";

    return (
        <>
            <div className="search-sort" aria-busy={pending}>
                <select
                    aria-label={t.label}
                    value={selected}
                    onChange={(event) => {
                        const sort = event.currentTarget.value;

                        startTransition(() => {
                            router.replace(
                                searchUrl(params, {
                                    sort,
                                    page: undefined,
                                }),
                                { scroll: false },
                            );
                        });
                    }}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <ChevronDown size={15} aria-hidden="true" />
            </div>

            <NavigationProgress pending={pending} />
        </>
    );
}