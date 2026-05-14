"use client";

import {
  ListBox,
  Select,
  Separator,
} from "@heroui/react";
import flags from "react-phone-number-input/flags";
import {
  CheckIndicatorIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import {
  fieldControlSelectItemClassName,
  fieldControlSelectItemIndicatorClassName,
} from "@/components/ui/field-control";
import {
  SPECIALIST_PHONE_COUNTRIES,
  type SpecialistPhoneCountry,
  type SpecialistPhoneCountryCode,
} from "@/features/specialists/lib/specialist-phone";

const PHONE_COUNTRY_PRIMARY_COUNT = 4;

const phoneCountrySelectTriggerClassName = buttonClassName({
  className:
    "phone-country-select-trigger !grid h-10 min-h-10 w-[70px] min-w-[70px] grid-cols-[34px_12px] items-center justify-start gap-1 !rounded-[12px] !border-0 !bg-[var(--fill-secondary)] !py-1 !pl-3 !pr-2 text-[var(--label-secondary)] !shadow-none",
  size: "sm",
  variant: "quaternary",
});

type PhoneCountrySelectProps = {
  ariaLabel?: string;
  isInvalid?: boolean;
  onChange: (countryCode: SpecialistPhoneCountryCode) => void;
  popoverWidth?: number | null;
  shouldFlip?: boolean;
  value: SpecialistPhoneCountryCode;
};

function PhoneCountryFlag({
  countryCode,
  label,
}: {
  countryCode: SpecialistPhoneCountryCode;
  label: string;
}) {
  const Flag = flags[countryCode];

  return (
    <span className="flex h-8 w-[34px] flex-none items-center justify-center">
      <span
        data-phone-country-flag
        className="flex h-[22px] w-[34px] overflow-hidden rounded-[6px] [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      >
        {Flag ? <Flag title={label} /> : null}
      </span>
    </span>
  );
}

function PhoneCountryListItem({
  country,
}: {
  country: SpecialistPhoneCountry;
}) {
  return (
    <ListBox.Item
      key={country.code}
      id={country.code}
      textValue={country.label}
      className={fieldControlSelectItemClassName}
    >
      <span className="flex w-full min-w-0 items-center gap-3">
        <PhoneCountryFlag
          countryCode={country.code}
          label={country.label}
        />
        <span className="min-w-0 flex-1 truncate font-normal">
          {country.label}
        </span>
        <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
          {({ isSelected }) => (
            isSelected ? <CheckIndicatorIcon /> : null
          )}
        </ListBox.ItemIndicator>
      </span>
    </ListBox.Item>
  );
}

export function PhoneCountrySelect({
  ariaLabel = "Страна телефона специалиста",
  isInvalid = false,
  onChange,
  popoverWidth,
  shouldFlip = false,
  value,
}: PhoneCountrySelectProps) {
  const selectedCountry =
    SPECIALIST_PHONE_COUNTRIES.find((country) => country.code === value)
    ?? SPECIALIST_PHONE_COUNTRIES[0];

  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(nextKey) => {
        if (typeof nextKey !== "string") {
          return;
        }

        onChange(nextKey as SpecialistPhoneCountryCode);
      }}
      className="w-auto"
    >
      <Select.Trigger
        data-invalid={isInvalid ? "true" : undefined}
        className={phoneCountrySelectTriggerClassName}
      >
        <Select.Value className="!w-[34px] !min-w-[34px] !flex-none overflow-visible text-[16px] font-normal leading-6">
          <span className="flex w-[34px] flex-none items-center text-[var(--label-primary)]">
            <PhoneCountryFlag
              countryCode={selectedCountry.code}
              label={selectedCountry.label}
            />
          </span>
        </Select.Value>
        <Select.Indicator className="!static m-0 flex size-3 flex-none items-center justify-center text-[var(--label-secondary)]">
          <ChevronDownIcon />
        </Select.Indicator>
      </Select.Trigger>

      <Select.Popover
        placement="bottom start"
        shouldFlip={shouldFlip}
        className="dropdown-popover !min-w-0"
        style={{
          width: popoverWidth ?? undefined,
        }}
      >
        <ListBox
          aria-label={ariaLabel}
          className="dropdown-menu-default dropdown-menu-compact max-h-[360px] w-full min-w-0 overflow-y-auto text-[16px] leading-6"
        >
          <ListBox.Section>
            {SPECIALIST_PHONE_COUNTRIES
              .slice(0, PHONE_COUNTRY_PRIMARY_COUNT)
              .map((country) => (
                <PhoneCountryListItem
                  key={country.code}
                  country={country}
                />
              ))}
          </ListBox.Section>
          <Separator className="my-1" />
          <ListBox.Section>
            {SPECIALIST_PHONE_COUNTRIES
              .slice(PHONE_COUNTRY_PRIMARY_COUNT)
              .map((country) => (
                <PhoneCountryListItem
                  key={country.code}
                  country={country}
                />
              ))}
          </ListBox.Section>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
