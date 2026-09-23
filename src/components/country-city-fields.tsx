"use client";

import { useState } from "react";
import {
  countries,
  countryById,
  countryForCity,
  countryName,
  type Locale,
} from "@/lib/catalog";

export function CountryCityFields({
  defaultCity = "Prishtina",
  cityName = "city",
  locale = "en",
  countryLabel = "Country",
  cityLabel = "City",
  value,
  onCityChange,
}: {
  defaultCity?: string;
  cityName?: string;
  locale?: Locale;
  countryLabel?: string;
  cityLabel?: string;
  value?: string;
  onCityChange?: (city: string) => void;
}) {
  const selectedCity = value ?? defaultCity;
  const [countryId, setCountryId] = useState(
    countryForCity(selectedCity)?.id ?? "xk",
  );
  const [city, setCity] = useState(selectedCity);
  const country = countryById(countryId) ?? countries[0];
  const currentCity = onCityChange ? selectedCity : city;
  const cities = country.cities as readonly string[];
  const cityValue = cities.includes(currentCity) ? currentCity : cities[0];

  function chooseCountry(id: string) {
    const next = countryById(id) ?? countries[0];
    setCountryId(next.id);
    const nextCity = next.cities[0];
    setCity(nextCity);
    onCityChange?.(nextCity);
  }

  function chooseCity(nextCity: string) {
    setCity(nextCity);
    onCityChange?.(nextCity);
  }

  return (
    <>
      <label className="field">
        {countryLabel}
        <select
          value={countryId}
          onChange={(event) => chooseCountry(event.target.value)}
        >
          {countries.map((item) => (
            <option key={item.id} value={item.id}>
              {countryName(item, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {cityLabel}
        <select
          name={onCityChange ? undefined : cityName}
          value={cityValue}
          onChange={(event) => chooseCity(event.target.value)}
        >
          {cities.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
    </>
  );
}
