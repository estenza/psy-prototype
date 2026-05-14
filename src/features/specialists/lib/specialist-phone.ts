import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import mobileExamples from "libphonenumber-js/examples.mobile.json";

export type SpecialistPhoneCountryCode = CountryCode;

export type SpecialistPhoneCountry = {
  code: SpecialistPhoneCountryCode;
  callingCode: string;
  label: string;
};

export const DEFAULT_SPECIALIST_PHONE_COUNTRY: SpecialistPhoneCountryCode = "RU";

const PRIORITY_COUNTRIES: SpecialistPhoneCountryCode[] = ["RU", "KZ", "BY", "UA"];
const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });

function getCountryLabel(country: SpecialistPhoneCountryCode) {
  return regionNames.of(country) ?? country;
}

export const SPECIALIST_PHONE_COUNTRIES: SpecialistPhoneCountry[] = getCountries()
  .map((country) => ({
    code: country,
    callingCode: `+${getCountryCallingCode(country)}`,
    label: getCountryLabel(country),
  }))
  .sort((countryA, countryB) => {
    const priorityA = PRIORITY_COUNTRIES.indexOf(countryA.code);
    const priorityB = PRIORITY_COUNTRIES.indexOf(countryB.code);

    if (priorityA !== -1 || priorityB !== -1) {
      return (priorityA === -1 ? Number.POSITIVE_INFINITY : priorityA)
        - (priorityB === -1 ? Number.POSITIVE_INFINITY : priorityB);
    }

    return countryA.label.localeCompare(countryB.label, "ru");
  });

export function getSpecialistPhoneCountry(value: string | null | undefined) {
  return SPECIALIST_PHONE_COUNTRIES.find((country) => country.code === value) ?? null;
}

export function normalizeSpecialistPhoneCountry(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  return getSpecialistPhoneCountry(normalizedValue)?.code ?? null;
}

export function normalizeSpecialistPhoneNumber(
  countryCode: SpecialistPhoneCountryCode,
  value: unknown,
) {
  const country = getSpecialistPhoneCountry(countryCode);

  if (!country || typeof value !== "string") {
    return null;
  }

  const nationalDigits = getSpecialistPhoneNationalDigits(countryCode, value);

  if (!nationalDigits) {
    return null;
  }

  const phoneNumber = `${country.callingCode}${nationalDigits}`;

  if (!isValidPhoneNumber(phoneNumber)) {
    return null;
  }

  return phoneNumber;
}

export function getSpecialistPhoneNationalDigits(
  countryCode: SpecialistPhoneCountryCode,
  value: unknown,
) {
  const country = getSpecialistPhoneCountry(countryCode);

  if (!country || typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const parsedPhoneNumber = parsePhoneNumberFromString(trimmedValue, countryCode);
  const callingCodeDigits = country.callingCode.replace(/\D/g, "");
  const rawDigits = trimmedValue.replace(/\D/g, "");
  const nationalDigits =
    parsedPhoneNumber?.country === countryCode
      || parsedPhoneNumber?.countryCallingCode === callingCodeDigits
      ? parsedPhoneNumber.nationalNumber
      : trimmedValue.startsWith("+") && rawDigits.startsWith(callingCodeDigits)
        ? rawDigits.slice(callingCodeDigits.length)
        : rawDigits;

  return limitSpecialistPhoneNationalDigits(countryCode, nationalDigits);
}

export function formatSpecialistPhoneNumberInput(
  countryCode: SpecialistPhoneCountryCode,
  value: unknown,
) {
  const country = getSpecialistPhoneCountry(countryCode);
  const nationalDigits = getSpecialistPhoneNationalDigits(countryCode, value);

  if (!country || !nationalDigits) {
    return "";
  }

  const formattedValue = new AsYouType(countryCode).input(nationalDigits);

  return formattedValue.replace(/\D+/g, " ").trim();
}

export function getSpecialistPhoneNumberInputMaxLength(
  countryCode: SpecialistPhoneCountryCode,
) {
  const maxDigits = limitSpecialistPhoneNationalDigits(countryCode, "9".repeat(32));

  return formatSpecialistPhoneNumberInput(countryCode, maxDigits).length;
}

function limitSpecialistPhoneNationalDigits(
  countryCode: SpecialistPhoneCountryCode,
  value: string,
) {
  const maxLength = getSpecialistPhoneNationalDigitsMaxLength(countryCode);

  if (maxLength <= 0) {
    return "";
  }

  return value.replace(/\D/g, "").slice(0, maxLength);
}

function getSpecialistPhoneNationalDigitsMaxLength(
  countryCode: SpecialistPhoneCountryCode,
) {
  return mobileExamples[countryCode]?.length ?? 0;
}
