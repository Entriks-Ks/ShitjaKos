"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, MapPin } from "lucide-react";
import {
  countries,
  countryById,
  countryForCity,
  countryName,
  type Locale,
} from "@/lib/catalog";

export function SearchCityMenu({
  locale,
  label,
  allInCountry,
  changeCountryLabel,
  searchLabel,
  emptyLabel,
  defaultCity = "",
  defaultCountry = "",
}: {
  locale: Locale;
  label: string;
  allInCountry: string;
  changeCountryLabel: string;
  searchLabel: string;
  emptyLabel: string;
  defaultCity?: string;
  defaultCountry?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const inferred = countryForCity(defaultCity)?.id || defaultCountry || "xk";
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"country" | "city">("country");
  const [countryId, setCountryId] = useState(inferred);
  const [selected, setSelected] = useState(defaultCity);
  const [query, setQuery] = useState("");
  const country = countryById(countryId) ?? countries[0];
  const countryLabel = countryName(country, locale);
  const allLabel = allInCountry.replace("{country}", countryLabel);
  const buttonLabel = selected ? `${selected}, ${countryLabel}` : allLabel;

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = [...country.cities];
    if (!needle) return list;
    return list.filter((city) => city.toLowerCase().includes(needle));
  }, [country, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        setStep("country");
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        setStep("country");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function chooseCountry(id: string) {
    setCountryId(id);
    setSelected("");
    if (countryInputRef.current) countryInputRef.current.value = id;
    if (cityInputRef.current) cityInputRef.current.value = "";
    setQuery("");
    setStep("city");
  }

  function chooseCity(city: string) {
    setSelected(city);
    if (cityInputRef.current) cityInputRef.current.value = city;
    if (countryInputRef.current) countryInputRef.current.value = countryId;
    setOpen(false);
    setQuery("");
    setStep("country");
  }

  return (
    <div className="search-city" ref={rootRef}>
      <input ref={countryInputRef} type="hidden" name="country" value={countryId} />
      <input ref={cityInputRef} type="hidden" name="city" value={selected} />
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
          setStep("country");
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
          {step === "country" ? (
            countries.map((item) => {
              const picked = item.id === countryId && !selected;
              const name = countryName(item, locale);
              return (
                <button
                  type="button"
                  key={item.id}
                  className="search-city-option"
                  role="option"
                  aria-selected={item.id === countryId}
                  onClick={() => chooseCountry(item.id)}
                >
                  <span className={`search-country-dot is-${item.id}`} aria-hidden="true" />
                  <span>{name}</span>
                  {picked ? (
                    <Check className="search-city-check" size={14} aria-hidden="true" />
                  ) : null}
                </button>
              );
            })
          ) : (
            <>
              <button
                type="button"
                className="search-city-back"
                onClick={() => {
                  setStep("country");
                  setQuery("");
                }}
              >
                <ChevronLeft size={15} aria-hidden="true" />
                {changeCountryLabel}
              </button>
              <div className="search-city-filter">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (options.length === 1) chooseCity(options[0]);
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
                  onClick={() => chooseCity("")}
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
                    onClick={() => chooseCity(city)}
                  >
                    <MapPin size={15} aria-hidden="true" />
                    <span>{city}</span>
                    {picked ? (
                      <Check className="search-city-check" size={14} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
              {options.length === 0 ? <p className="search-city-empty">{emptyLabel}</p> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
