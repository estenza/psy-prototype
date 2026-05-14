"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  TextInputField,
  SelectField,
} from "@/components/ui/field-control";
import { EMAIL_PATTERN } from "@/features/auth/constants";
import type { AdminManagedUserFieldErrorName } from "@/features/admin/types";
import type { SpecialistGender } from "@/features/auth/types";
import {
  createInitialDraft,
  persistSpecialistApplicationDraft,
  readSpecialistApplicationState,
} from "@/features/specialists/components/specialist-application-flow";

type SpecialistApplicationFormErrors = Partial<
  Record<AdminManagedUserFieldErrorName, string>
>;

const SPECIALIST_GENDER_OPTIONS: Array<{
  label: string;
  value: SpecialistGender;
}> = [
  { label: "Мужской", value: "male" },
  { label: "Женский", value: "female" },
];

const REQUIRED_FIELD_ERROR = "Обязательное поле";
const BIRTH_DATE_FORMAT_ERROR = "Введите дату в формате дд.мм.гггг";
const BIRTH_DATE_INVALID_ERROR = "Введите корректную дату";
const BIRTH_DATE_FUTURE_ERROR = "Год рождения не может быть из будущего";

function clearFieldError(
  errors: SpecialistApplicationFormErrors,
  fieldName: AdminManagedUserFieldErrorName,
) {
  if (!errors[fieldName]) {
    return errors;
  }

  return {
    ...errors,
    [fieldName]: undefined,
  };
}

function formatBirthDateDisplayValue(value: string | null) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}.${month}.${year}`;
}

function formatBirthDateInputValue(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join(".");
}

function parseBirthDateInputValue(value: string) {
  if (!value.trim()) {
    return {
      error: REQUIRED_FIELD_ERROR,
      value: null,
    };
  }

  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    return {
      error: BIRTH_DATE_FORMAT_ERROR,
      value: null,
    };
  }

  const [dayPart, monthPart, yearPart] = value.split(".");
  const day = Number(dayPart);
  const month = Number(monthPart);
  const year = Number(yearPart);
  const now = new Date();

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return {
      error: BIRTH_DATE_INVALID_ERROR,
      value: null,
    };
  }

  if (year > now.getFullYear()) {
    return {
      error: BIRTH_DATE_FUTURE_ERROR,
      value: null,
    };
  }

  const parsedDate = new Date(year, month - 1, day);
  const isValidDate =
    parsedDate.getFullYear() === year
    && parsedDate.getMonth() === month - 1
    && parsedDate.getDate() === day;

  if (!isValidDate || parsedDate.getTime() > now.getTime()) {
    return {
      error: BIRTH_DATE_INVALID_ERROR,
      value: null,
    };
  }

  return {
    error: null,
    value: `${yearPart}-${monthPart}-${dayPart}`,
  };
}

export function SpecialistApplicationForm() {
  const router = useRouter();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [specialistGender, setSpecialistGender] = useState<SpecialistGender | null>(null);
  const [specialistBirthDateInput, setSpecialistBirthDateInput] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SpecialistApplicationFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedApplicationState = readSpecialistApplicationState();

      if (storedApplicationState?.draft) {
        const storedDraft = storedApplicationState.draft;

        setLastName(storedDraft.lastName);
        setFirstName(storedDraft.firstName);
        setPatronymic(storedDraft.patronymic);
        setSpecialistGender(storedDraft.specialistGender || null);
        setSpecialistBirthDateInput(formatBirthDateDisplayValue(storedDraft.specialistBirthDate));
        setEmail(storedDraft.email || storedDraft.contacts.email.value);
      }

      setIsClientReady(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  function clearError(fieldName: AdminManagedUserFieldErrorName) {
    setFieldErrors((currentErrors) => clearFieldError(currentErrors, fieldName));
    setFormError(null);
    setSubmittedMessage(null);
  }

  function handleSpecialistBirthDateInputChange(value: string) {
    const nextValue = formatBirthDateInputValue(value);
    setSpecialistBirthDateInput(nextValue);

    if (!parseBirthDateInputValue(nextValue).error) {
      clearError("specialistBirthDate");
    }
  }

  function validateForm() {
    const nextErrors: SpecialistApplicationFormErrors = {};
    const parsedBirthDate = parseBirthDateInputValue(specialistBirthDateInput);

    if (!lastName.trim()) {
      nextErrors.lastName = REQUIRED_FIELD_ERROR;
    }

    if (!firstName.trim()) {
      nextErrors.firstName = REQUIRED_FIELD_ERROR;
    }

    if (!specialistGender) {
      nextErrors.specialistGender = REQUIRED_FIELD_ERROR;
    }

    if (parsedBirthDate.error) {
      nextErrors.specialistBirthDate = parsedBirthDate.error;
    }

    if (!email.trim()) {
      nextErrors.email = REQUIRED_FIELD_ERROR;
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = REQUIRED_FIELD_ERROR;
    }

    setFieldErrors(nextErrors);

    return {
      birthDate: parsedBirthDate.value,
      isValid: Object.keys(nextErrors).length === 0,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmittedMessage(null);

    const validationResult = validateForm();

    if (!validationResult.isValid) {
      return;
    }

    setIsSubmitting(true);

    const nextEmail = email.trim();
    const storedApplicationState = readSpecialistApplicationState();
    const storedDraft = storedApplicationState?.draft;
    const canReuseStoredDraft = Boolean(
      storedDraft
      && storedDraft.email.trim().toLowerCase() === nextEmail.toLowerCase(),
    );
    const nextDraft = canReuseStoredDraft && storedDraft
      ? { ...storedDraft }
      : createInitialDraft();

    nextDraft.email = nextEmail;
    nextDraft.firstName = firstName.trim();
    nextDraft.lastName = lastName.trim();
    nextDraft.patronymic = patronymic.trim();
    nextDraft.specialistBirthDate = validationResult.birthDate ?? "";
    nextDraft.specialistGender = specialistGender ?? "";
    nextDraft.specialistPhoneNumber = "";
    nextDraft.contacts.email.value = nextEmail;
    nextDraft.contactVerified = canReuseStoredDraft && storedDraft
      ? storedDraft.contactVerified
      : false;

    persistSpecialistApplicationDraft(nextDraft, "general");

    persistSpecialistApplicationDraft(
      nextDraft,
      nextDraft.contactVerified ? "specialization" : "contact",
    );
    router.push("/for-psychologists?flow=application");
    setIsSubmitting(false);
  }

  if (!isClientReady) {
    return (
      <div className="surface-elevated min-h-[496px] w-full rounded-[28px]" />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="surface-elevated grid w-full gap-6 rounded-[28px] p-6"
    >
      <div className="grid min-w-0 gap-5">
        <TextInputField
          autoComplete="family-name"
          label="Фамилия"
          name="lastName"
          onChange={(value) => {
            setLastName(value);
            clearError("lastName");
          }}
          placeholder="Иванов"
          value={lastName}
          error={fieldErrors.lastName}
        />

        <div className="grid items-start gap-x-6 gap-y-5 min-[720px]:grid-cols-2">
          <TextInputField
            autoComplete="given-name"
            label="Имя"
            name="firstName"
            onChange={(value) => {
              setFirstName(value);
              clearError("firstName");
            }}
            placeholder="Иван"
            value={firstName}
            error={fieldErrors.firstName}
          />

          <TextInputField
            autoComplete="additional-name"
            label="Отчество, если есть"
            name="patronymic"
            onChange={(value) => {
              setPatronymic(value);
              clearError("patronymic");
            }}
            placeholder="Иванович"
            value={patronymic}
            error={fieldErrors.patronymic}
          />
        </div>

        <div className="grid items-start gap-x-6 gap-y-5 min-[720px]:grid-cols-2">
          <SelectField
            error={fieldErrors.specialistGender}
            label="Ваш пол"
            options={SPECIALIST_GENDER_OPTIONS}
            placeholder="Выберите пол"
            value={specialistGender ?? ""}
            onChange={(value) => {
              setSpecialistGender(value as SpecialistGender);
              clearError("specialistGender");
            }}
          />

          <TextInputField
            autoComplete="bday"
            autoCorrect="off"
            disablePasswordManagerHints
            error={fieldErrors.specialistBirthDate}
            inputMode="numeric"
            label="Дата рождения"
            maxLength={10}
            onBlur={() => {
              const parsedBirthDate = parseBirthDateInputValue(specialistBirthDateInput);

              if (parsedBirthDate.error && specialistBirthDateInput) {
                setFieldErrors((currentErrors) => ({
                  ...currentErrors,
                  specialistBirthDate: parsedBirthDate.error,
                }));
              }
            }}
            onChange={handleSpecialistBirthDateInputChange}
            placeholder="24.01.1977"
            spellCheck={false}
            value={specialistBirthDateInput}
          />
        </div>

        <div className="grid items-start gap-x-6 gap-y-5 min-[720px]:grid-cols-2">
          <TextInputField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            inputMode="email"
            label="Адрес электронной почты"
            name="email"
            onChange={(value) => {
              setEmail(value);
              clearError("email");
            }}
            placeholder="Введите Email"
            spellCheck={false}
            type="email"
            value={email}
            error={fieldErrors.email}
          />
        </div>

        {formError ? (
          <p className="text-[14px] leading-5 text-[var(--danger)]">
            {formError}
          </p>
        ) : null}

        {submittedMessage ? (
          <p className="rounded-[16px] bg-[var(--fill-secondary)] px-4 py-3 text-[14px] leading-5 text-[var(--label-secondary)]">
            {submittedMessage}
          </p>
        ) : null}

        <div className="flex justify-start pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-[200px]"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Далее
          </Button>
        </div>

        <p className="w-full text-[14px] leading-5 text-[var(--label-quaternary)]">
          Нажимая «Далее», вы принимаете{" "}
          <a
            href="#"
            className="cursor-pointer text-[var(--accent-primary)] underline-offset-2 hover:underline"
          >
            Политику обработки персональных данных
          </a>.
        </p>
      </div>
    </form>
  );
}
