"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

export function SearchCityMenu({
  cities,
  label,
  allLabel,
  searchLabel,
  emptyLabel,
  defaultValue = "",
}: {
  cities: readonly string[];
  label: string;
  allLabel: string;
  searchLabel: string;
  emptyLabel: string;
  defaultValue?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [...cities];
    return cities.filter((city) => city.toLowerCase().includes(needle));
  }, [cities, query]);

  const buttonLabel = selected || allLabel;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(city: string) {
    setSelected(city);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="search-city" ref={rootRef}>
      <input type="hidden" name="city" value={selected} />
      <button
        type="button"
        className="search-city-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        <span className="search-city-trigger-label">
          <MapPin size={16} aria-hidden="true" />
          <span>{buttonLabel}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open ? (
        <div className="search-city-panel" id={listId} role="listbox">
          <div className="search-city-filter">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (options.length === 1) choose(options[0]);
              }}
              placeholder={searchLabel}
              aria-label={searchLabel}
              autoFocus
            />
          </div>
          {!query.trim() ? (
            <button
              type="button"
              className="search-city-option"
              role="option"
              aria-selected={!selected}
              onClick={() => choose("")}
            >
              <MapPin size={15} aria-hidden="true" />
              <span>{allLabel}</span>
              {!selected ? (
                <Check className="search-city-check" size={14} aria-hidden="true" />
              ) : null}
            </button>
          ) : null}
          {options.map((city) => {
            const picked = selected === city;
            return (
              <button
                type="button"
                key={city}
                className="search-city-option"
                role="option"
                aria-selected={picked}
                onClick={() => choose(city)}
              >
                <MapPin size={15} aria-hidden="true" />
                <span>{city}</span>
                {picked ? (
                  <Check className="search-city-check" size={14} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
          {options.length === 0 ? (
            <p className="search-city-empty">{emptyLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
