import { X } from "lucide-react";
import Link from "@/components/navigation-link";
import {
    translated,
    optionLabel,
    countryName,
    countries,
    type Locale,
} from "@/lib/catalog";
import {
    categoryUrl,
    searchUrl,
    type SearchParams,
} from "@/lib/search-navigation";
import { parseAttributeFilters } from "@/lib/attribute-search";
import { catalogOptions } from "@/lib/attribute-dependencies";
import type { getCategories } from "@/repositories/catalog";

type Category = Awaited<ReturnType<typeof getCategories>>[number];

type Chip = {
    id: string;
    label: string;
    href: string;
};

export function ActiveSearchFilters({
    categories,
    params,
    locale,
}: {
    categories: Category[];
    params: SearchParams;
    locale: Locale;
}) {
    const selected = categories.find(
        (category) => category.id === params.category,
    );

    const fields = selected?.attributes ?? [];
    const chips: Chip[] = [];

    const text = {
        sq: {
            remove: "Hiq",
            yes: "Po",
            no: "Jo",
            price: "Çmimi",
            from: "nga",
            to: "deri",
        },
        en: {
            remove: "Remove",
            yes: "Yes",
            no: "No",
            price: "Price",
            from: "from",
            to: "up to",
        },
        de: {
            remove: "Entfernen",
            yes: "Ja",
            no: "Nein",
            price: "Preis",
            from: "ab",
            to: "bis",
        },
    }[locale];

    function without(...keys: string[]) {
        const next = { ...params };
        delete next.page;

        for (const key of keys) {
            delete next[key];
        }

        return searchUrl(next);
    }

    function removeField(id: string, remaining?: string[]) {
        const next = { ...params };
        delete next.page;

        function clear(fieldId: string) {
            delete next[`field_${fieldId}`];
            delete next[`choices_${fieldId}`];
            delete next[`from_${fieldId}`];
            delete next[`to_${fieldId}`];

            if (next.attribute === fieldId) {
                delete next.attribute;
                delete next.value;
            }
        }

        clear(id);

        if (remaining?.length) {
            next[`choices_${id}`] = JSON.stringify(remaining);
        }

        // Removing a parent choice also clears dependent filters.
        // For example: removing Brand clears Model.
        const affected = new Set([id]);

        for (let pass = 0; pass < fields.length; pass++) {
            let changed = false;

            for (const field of fields) {
                if (
                    field.dependsOnId &&
                    affected.has(field.dependsOnId) &&
                    !affected.has(field.id)
                ) {
                    clear(field.id);
                    affected.add(field.id);
                    changed = true;
                }
            }

            if (!changed) break;
        }

        return searchUrl(next);
    }

    function rangeLabel(from?: string, to?: string) {
        if (from && to) return `${from}–${to}`;
        if (from) return `${text.from} ${from}`;
        return `${text.to} ${to}`;
    }

    if (selected) {
        chips.push({
            id: "category",
            label: translated(selected.translations, locale),
            // Removing a subcategory returns to its parent.
            href: categoryUrl(params, selected.parentId ?? undefined),
        });
    }

    if (params.q) {
        chips.push({
            id: "q",
            label: `“${params.q}”`,
            href: without("q"),
        });
    }

    if (params.city) {
        chips.push({
            id: "city",
            label: params.city,
            href: without("city"),
        });
    }

    if (params.country) {
        const country = countries.find(
            (item) => item.id === params.country,
        );

        chips.push({
            id: "country",
            label: country
                ? countryName(country, locale)
                : params.country,
            href: without("country", "city"),
        });
    }

    if (params.min || params.max) {
        chips.push({
            id: "price",
            label: `${text.price}: ${rangeLabel(params.min, params.max)} €`,
            href: without("min", "max"),
        });
    }

    const conditionNames = {
        sq: ["E re", "Si e re", "E përdorur", "Me defekt", "Për pjesë"],
        en: ["New", "Like new", "Used", "Defective", "For parts"],
        de: ["Neu", "Wie neu", "Gebraucht", "Defekt", "Als Ersatzteile"],
    }[locale];

    const conditionKeys = [
        "NEW",
        "LIKE_NEW",
        "USED",
        "DEFECTIVE",
        "FOR_PARTS",
    ];

    if (params.condition) {
        const index = conditionKeys.indexOf(params.condition);

        chips.push({
            id: "condition",
            label: conditionNames[index] ?? params.condition,
            href: without("condition"),
        });
    }

    if (params.seller) {
        const sellerNames: Record<string, string> = {
            private: { sq: "Privat", en: "Private", de: "Privat" }[locale],
            business: { sq: "Biznes", en: "Business", de: "Gewerblich" }[locale],
            verified: { sq: "Biznes", en: "Business", de: "Gewerblich" }[locale],
        };

        chips.push({
            id: "seller",
            label: sellerNames[params.seller] ?? params.seller,
            href: without("seller"),
        });
    }

    const filters = parseAttributeFilters(params);

    // Support older URLs using attribute=...&value=...
    if (
        params.attribute &&
        params.value &&
        !filters.some((filter) => filter.id === params.attribute)
    ) {
        filters.push({
            id: params.attribute,
            choice: params.value,
        });
    }

    for (const filter of filters) {
        const field = fields.find((item) => item.id === filter.id);
        if (!field) continue;

        const fieldName = translated(field.translations, locale);
        const choices =
            filter.choices ??
            (filter.choice !== undefined ? [filter.choice] : []);

        for (const value of choices) {
            const option = catalogOptions(field.options).find(
                (item) => item.value === value,
            );

            const label =
                field.type === "BOOLEAN"
                    ? value === "true"
                        ? text.yes
                        : text.no
                    : option
                        ? optionLabel(option, locale)
                        : value;

            chips.push({
                id: `${field.id}:${value}`,
                label: `${fieldName}: ${label}`,
                href: removeField(
                    field.id,
                    filter.choices?.filter((item) => item !== value),
                ),
            });
        }

        if (filter.from !== undefined || filter.to !== undefined) {
            chips.push({
                id: `${field.id}:range`,
                label: `${fieldName}: ${rangeLabel(
                    filter.from?.toString(),
                    filter.to?.toString(),
                )}${field.unit ? ` ${field.unit}` : ""}`,
                href: removeField(field.id),
            });
        }
    }

    if (!chips.length) return null;

    return (
        <ul className="active-search-filters">
            {chips.map((chip) => (
                <li key={chip.id}>
                    <Link
                        href={chip.href}
                        className="active-search-filter"
                        aria-label={`${text.remove}: ${chip.label}`}
                        title={`${text.remove}: ${chip.label}`}
                    >
                        <span>{chip.label}</span>
                        <X size={13} strokeWidth={2.5} aria-hidden="true" />
                    </Link>
                </li>
            ))}
        </ul>
    );
}