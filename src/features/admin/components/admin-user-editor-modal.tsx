"use client";

import {
  Calendar,
  Chip,
  DatePicker,
  Header,
  Label,
  ListBox,
  Modal,
  Separator,
  Select,
  Tabs,
  TextArea,
  TextField,
  cn,
} from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { CalendarStateContext } from "react-aria-components";
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  TextareaField,
  TextInputField,
  fieldControlDateTriggerClassName,
  fieldControlLabelClassName,
  fieldControlSelectItemClassName,
  fieldControlSelectItemIndicatorClassName,
  fieldControlSelectTriggerClassName,
} from "@/components/ui/field-control";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIndicatorIcon,
  CloseIcon,
  CrossSmallIcon,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button-styles";
import { IconButton } from "@/components/ui/icon-button";
import {
  ADMIN_ACCOUNT_NAME_MAX_LENGTH,
  ADMIN_USER_NAME_MAX_LENGTH,
  getAdminAccountNameError,
  getAdminUserNameError,
  normalizeAdminAccountName,
} from "@/features/admin/lib/admin-user-fields";
import {
  ADMIN_SPECIALTY_MAX_SELECTED,
  ADMIN_SPECIALTY_OPTIONS,
} from "@/features/admin/lib/admin-specialties";
import {
  SPECIALIST_WORK_TOPIC_GROUPS,
  SPECIALIST_WORK_TOPIC_OPTIONS,
} from "@/features/specialists/lib/specialist-work-topics";
import {
  SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH,
  SPECIALIST_EDUCATION_MAX_ITEMS,
  SPECIALIST_EDUCATION_STUDYING_NOW_VALUE,
} from "@/features/auth/lib/education";
import {
  buildCroppedImageDataUrl,
  DEFAULT_IMAGE_CROP_VALUE,
  type ImageCropValue,
} from "@/features/media/lib/image-upload";
import { ImageUploadCropField } from "@/features/media/components/image-upload-crop-field";
import { BackNavigationButton } from "@/features/topic-creation/components/back-navigation-button";
import type { AdminListedUser, AdminManagedUserFieldErrorName } from "@/features/admin/types";
import type { SpecialistEducationItem, SpecialistGender, UserRole } from "@/features/auth/types";

type AdminUserEditorModalProps = {
  defaultRole?: UserRole;
  embedded?: boolean;
  hideNickname?: boolean;
  hideProfessionalSection?: boolean;
  initialUser?: AdminListedUser | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSaved?: (user: AdminListedUser) => void;
  submitButtonLabel?: string;
  submitEndpoint?: string;
  successMessage?: string;
  titleOverride?: string;
};

type AdminUserEditorFormErrors = {
  [Key in AdminManagedUserFieldErrorName]?: string;
};

type SpecialistEditorTab = "general" | "professional";

const EMPTY_ERROR = "";
const REQUIRED_FIELD_ERROR = "Это поле обязательно";
const USER_DESCRIPTION_LIMIT = 250;
const SPECIALIST_DESCRIPTION_LIMIT = 1500;
const EMPTY_FORM_ERRORS: AdminUserEditorFormErrors = {};
const SPECIALTY_LIMIT_ERROR = `Выберите не больше ${ADMIN_SPECIALTY_MAX_SELECTED} подходов`;
const SPECIALIST_GENDER_OPTIONS: Array<{
  label: string;
  value: SpecialistGender;
}> = [
  { label: "Женский", value: "female" },
  { label: "Мужской", value: "male" },
];
const EDUCATION_YEAR_START = 1980;
const EDUCATION_CURRENT_YEAR = new Date().getFullYear();
const EDUCATION_YEAR_OPTIONS = [
  SPECIALIST_EDUCATION_STUDYING_NOW_VALUE,
  ...Array.from(
    { length: Math.max(EDUCATION_CURRENT_YEAR - EDUCATION_YEAR_START + 1, 0) },
    (_, index) => String(EDUCATION_CURRENT_YEAR - index),
  ),
];
const SPECIALIST_BIRTH_DATE_MIN_VALUE = parseDate("1955-01-01");
const SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE = 12;
const SPECIALIST_BIRTH_DATE_MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const modalInternalPortalSelector = [
  '[data-slot="modal-dialog"]',
  '[data-slot="popover"]',
  ".field-control-date-popover",
  '[data-slot="calendar"]',
  '[role="listbox"]',
].join(", ");
function buildInitialState(
  initialUser?: AdminListedUser | null,
  defaultRole: UserRole = "user",
) {
  const role = initialUser?.role ?? defaultRole;

  return {
    avatarSourceUrl:
      initialUser?.avatarSourceUrl
      ?? initialUser?.avatarCardUrl
      ?? initialUser?.avatarUrl
      ?? null,
    avatarSquareCrop: DEFAULT_IMAGE_CROP_VALUE,
    displayName: initialUser?.role === "user" ? initialUser.displayName : "",
    email: initialUser?.email ?? "",
    firstName: initialUser?.firstName ?? "",
    lastName: initialUser?.lastName ?? "",
    patronymic: initialUser?.patronymic ?? "",
    nickname: initialUser?.nickname ?? "",
    profileDescription: initialUser?.profileDescription ?? "",
    education: initialUser?.education ?? [],
    role,
    specialties: initialUser?.specialties ?? [],
    specialistGender: initialUser?.specialistGender ?? null,
    specialistBirthDate: initialUser?.specialistBirthDate ?? null,
    specialistTelegramUrl: initialUser?.specialistTelegramUrl ?? "",
    specialistMaxUrl: initialUser?.specialistMaxUrl ?? "",
    specialistWhatsappUrl: initialUser?.specialistWhatsappUrl ?? "",
    workTopics: initialUser?.workTopics ?? [],
  };
}

function parseDatePickerValue(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

function formatDatePickerDisplayValue(value: string | null) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}.${month}.${year}`;
}

function getSpecialistBirthDateYearPageStart({
  maxYear,
  minYear,
  year,
}: {
  maxYear: number;
  minYear: number;
  year: number;
}) {
  const lastPageStart =
    minYear + Math.floor((maxYear - minYear) / SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE)
    * SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE;
  const clampedYear = Math.min(Math.max(year, minYear), maxYear);
  const pageStart =
    minYear + Math.floor((clampedYear - minYear) / SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE)
    * SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE;

  return Math.min(pageStart, lastPageStart);
}

function SpecialistBirthDateMonthPicker({
  isOpen,
  maxMonth,
  maxYear,
  minMonth,
  minYear,
  onClose,
}: {
  isOpen: boolean;
  maxMonth: number;
  maxYear: number;
  minMonth: number;
  minYear: number;
  onClose: () => void;
}) {
  const calendarState = useContext(CalendarStateContext);

  if (!isOpen || !calendarState) {
    return null;
  }

  const focusedYear = calendarState.focusedDate.year;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  return (
    <div
      aria-label="Выберите месяц"
      className="grid grid-cols-3 content-start gap-1 py-1"
    >
      {SPECIALIST_BIRTH_DATE_MONTHS.map((monthLabel, index) => {
        const monthNumber = index + 1;
        const isCurrentMonth = focusedYear === currentYear && monthNumber === currentMonth;
        const isDisabled =
          (focusedYear === minYear && monthNumber < minMonth)
          || (focusedYear === maxYear && monthNumber > maxMonth);

        return (
          <button
            key={monthLabel}
            aria-disabled={isDisabled || undefined}
            className={cn(
              "relative inline-flex h-10 items-center justify-center rounded-full px-3 text-[14px] font-medium leading-5 text-[var(--label-primary)] transition-colors",
              !isDisabled
                ? "hover:bg-[var(--color-accent-soft)]"
                : "",
              isDisabled
                ? "cursor-default text-[var(--label-quaternary)]"
                : "cursor-pointer",
            )}
            disabled={isDisabled}
            type="button"
            onClick={() => {
              const daysInMonth = new Date(focusedYear, monthNumber, 0).getDate();
              const nextDate = calendarState.focusedDate.set({
                day: Math.min(calendarState.focusedDate.day, daysInMonth),
                month: monthNumber,
              });

              calendarState.setFocusedDate(nextDate);
              onClose();
            }}
          >
            {monthLabel}
            {isCurrentMonth ? (
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--danger)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SpecialistBirthDateMonthPickerTrigger({
  isOpen,
  onPress,
}: {
  isOpen: boolean;
  onPress: () => void;
}) {
  const calendarState = useContext(CalendarStateContext);

  if (!calendarState) {
    return null;
  }

  const monthLabel =
    SPECIALIST_BIRTH_DATE_MONTHS[calendarState.focusedDate.month - 1] ?? "";

  return (
    <button
      aria-expanded={isOpen}
      aria-label="Выбрать месяц"
      className={buttonClassName({
        className: "min-w-0 flex-1 text-center",
        size: "xs",
        variant: "tertiary",
      })}
      data-open={isOpen || undefined}
      type="button"
      onClick={onPress}
    >
      {monthLabel}
    </button>
  );
}

function SpecialistBirthDateYearPickerTrigger({
  isOpen,
  onPress,
}: {
  isOpen: boolean;
  onPress: () => void;
}) {
  const calendarState = useContext(CalendarStateContext);

  if (!calendarState) {
    return null;
  }

  return (
    <button
      aria-expanded={isOpen}
      aria-label="Выбрать год"
      className={buttonClassName({
        className: "w-16 flex-none text-center",
        size: "xs",
        variant: "tertiary",
      })}
      data-open={isOpen || undefined}
      type="button"
      onClick={onPress}
    >
      {calendarState.focusedDate.year}
    </button>
  );
}

function SpecialistBirthDateMonthPickerYearNavButton({
  direction,
  maxMonth,
  maxYear,
  minMonth,
  minYear,
}: {
  direction: "next" | "previous";
  maxMonth: number;
  maxYear: number;
  minMonth: number;
  minYear: number;
}) {
  const calendarState = useContext(CalendarStateContext);

  if (!calendarState) {
    return null;
  }

  const focusedYear = calendarState.focusedDate.year;
  const isPrevious = direction === "previous";
  const isDisabled = isPrevious
    ? focusedYear <= minYear
    : focusedYear >= maxYear;

  return (
    <button
      aria-label={isPrevious ? "Предыдущий год" : "Следующий год"}
      className={buttonClassName({
        className: isDisabled
          ? "cursor-default opacity-40"
          : "cursor-pointer",
        isIconOnly: true,
        size: "xs",
        variant: "quaternary",
      })}
      disabled={isDisabled}
      type="button"
      onClick={() => {
        const nextYear = focusedYear + (isPrevious ? -1 : 1);
        const nextMonth = Math.min(
          Math.max(
            calendarState.focusedDate.month,
            nextYear === minYear ? minMonth : 1,
          ),
          nextYear === maxYear ? maxMonth : 12,
        );
        const daysInMonth = new Date(nextYear, nextMonth, 0).getDate();
        const nextDate = calendarState.focusedDate.set({
          day: Math.min(calendarState.focusedDate.day, daysInMonth),
          month: nextMonth,
          year: nextYear,
        });

        calendarState.setFocusedDate(nextDate);
      }}
    >
      {isPrevious ? <ArrowLeftIcon /> : <ArrowRightIcon />}
    </button>
  );
}

function SpecialistBirthDateYearPickerPageNavButton({
  direction,
  maxYear,
  minYear,
  onPageStartChange,
  pageStart,
}: {
  direction: "next" | "previous";
  maxYear: number;
  minYear: number;
  onPageStartChange: (pageStart: number) => void;
  pageStart: number;
}) {
  const isPrevious = direction === "previous";
  const lastPageStart =
    minYear + Math.floor((maxYear - minYear) / SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE)
    * SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE;
  const isDisabled = isPrevious
    ? pageStart <= minYear
    : pageStart >= lastPageStart;

  return (
    <button
      aria-label={isPrevious ? "Предыдущая страница годов" : "Следующая страница годов"}
      className={buttonClassName({
        className: isDisabled
          ? "cursor-default opacity-40"
          : "cursor-pointer",
        isIconOnly: true,
        size: "xs",
        variant: "quaternary",
      })}
      disabled={isDisabled}
      type="button"
      onClick={() => {
        const nextPageStart = pageStart + (
          isPrevious
            ? -SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE
            : SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE
        );

        onPageStartChange(Math.min(Math.max(nextPageStart, minYear), lastPageStart));
      }}
    >
      {isPrevious ? <ArrowLeftIcon /> : <ArrowRightIcon />}
    </button>
  );
}

function SpecialistBirthDateYearPicker({
  maxMonth,
  maxYear,
  minMonth,
  minYear,
  onClose,
  pageStart,
}: {
  maxMonth: number;
  maxYear: number;
  minMonth: number;
  minYear: number;
  onClose: () => void;
  pageStart: number;
}) {
  const calendarState = useContext(CalendarStateContext);
  const pageEnd = pageStart + SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE - 1;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: SPECIALIST_BIRTH_DATE_YEAR_PAGE_SIZE },
    (_, index) => pageStart + index,
  ).filter((year) => year >= minYear && year <= maxYear);

  if (!calendarState) {
    return null;
  }

  return (
    <div
      aria-label={`Годы ${pageStart}-${pageEnd}`}
      className="grid grid-cols-3 content-start gap-1 py-1"
      role="listbox"
    >
      {years.map((year) => {
        const isSelected = year === calendarState.focusedDate.year;
        const isCurrentYear = year === currentYear;

        return (
          <button
            key={year}
            aria-selected={isSelected}
            className="relative inline-flex h-10 items-center justify-center rounded-full px-3 text-[14px] font-medium leading-5 text-[var(--label-primary)] transition-colors hover:bg-[var(--color-accent-soft)]"
            role="option"
            type="button"
            onClick={() => {
              const nextMonth = Math.min(
                Math.max(
                  calendarState.focusedDate.month,
                  year === minYear ? minMonth : 1,
                ),
                year === maxYear ? maxMonth : 12,
              );
              const daysInMonth = new Date(year, nextMonth, 0).getDate();
              const nextDate = calendarState.focusedDate.set({
                day: Math.min(calendarState.focusedDate.day, daysInMonth),
                month: nextMonth,
                year,
              });

              calendarState.setFocusedDate(nextDate);
              onClose();
            }}
          >
            {year}
            {isCurrentYear ? (
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--danger)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function AdminUserEditorModal({
  defaultRole = "user",
  embedded = false,
  hideNickname = false,
  hideProfessionalSection = false,
  initialUser = null,
  isOpen,
  onClose,
  onBack,
  onSaved,
  submitButtonLabel,
  submitEndpoint,
  successMessage,
  titleOverride,
}: AdminUserEditorModalProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(embedded);
  const [role, setRole] = useState<UserRole>("user");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [education, setEducation] = useState<SpecialistEducationItem[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialistGender, setSpecialistGender] = useState<SpecialistGender | null>(null);
  const [specialistBirthDate, setSpecialistBirthDate] = useState<string | null>(null);
  const [specialistBirthDateDraft, setSpecialistBirthDateDraft] = useState<string | null>(null);
  const [isSpecialistBirthDatePickerOpen, setIsSpecialistBirthDatePickerOpen] = useState(false);
  const [isSpecialistBirthDateMonthPickerOpen, setIsSpecialistBirthDateMonthPickerOpen] =
    useState(false);
  const [isSpecialistBirthDateYearPickerOpen, setIsSpecialistBirthDateYearPickerOpen] =
    useState(false);
  const [specialistBirthDateYearPageStart, setSpecialistBirthDateYearPageStart] = useState(
    getSpecialistBirthDateYearPageStart({
      minYear: SPECIALIST_BIRTH_DATE_MIN_VALUE.year,
      maxYear: new Date().getFullYear(),
      year: new Date().getFullYear(),
    }),
  );
  const [specialistTelegramUrl, setSpecialistTelegramUrl] = useState("");
  const [specialistMaxUrl, setSpecialistMaxUrl] = useState("");
  const [specialistWhatsappUrl, setSpecialistWhatsappUrl] = useState("");
  const [workTopics, setWorkTopics] = useState<string[]>([]);
  const [avatarSourceUrl, setAvatarSourceUrl] = useState<string | null>(null);
  const [avatarSquareCrop, setAvatarSquareCrop] = useState<ImageCropValue>(
    DEFAULT_IMAGE_CROP_VALUE,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [specialistTab, setSpecialistTab] = useState<SpecialistEditorTab>("general");
  const [errorMessage, setErrorMessage] = useState(EMPTY_ERROR);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<AdminUserEditorFormErrors>(
    EMPTY_FORM_ERRORS,
  );
  const specialistBirthDateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [requiredFieldWasFilled, setRequiredFieldWasFilled] = useState<
    Partial<Record<AdminManagedUserFieldErrorName, boolean>>
  >({});
  const isEditing = Boolean(initialUser);
  const shouldValidateProfessionalFields = role === "specialist" && !hideProfessionalSection;

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialState = buildInitialState(initialUser, defaultRole);
    setAvatarSourceUrl(initialState.avatarSourceUrl);
    setAvatarSquareCrop(initialState.avatarSquareCrop);
    setDisplayName(initialState.displayName);
    setEmail(initialState.email);
    setFirstName(initialState.firstName);
    setLastName(initialState.lastName);
    setPatronymic(initialState.patronymic);
    setNickname(initialState.nickname);
    setProfileDescription(initialState.profileDescription);
    setEducation(initialState.education);
    setRole(initialState.role);
    setSpecialties(initialState.specialties);
    setSpecialistGender(initialState.specialistGender);
    setSpecialistBirthDate(initialState.specialistBirthDate);
    setSpecialistBirthDateDraft(initialState.specialistBirthDate);
    setIsSpecialistBirthDatePickerOpen(false);
    setIsSpecialistBirthDateMonthPickerOpen(false);
    setIsSpecialistBirthDateYearPickerOpen(false);
    setSpecialistBirthDateYearPageStart(getSpecialistBirthDateYearPageStart({
      minYear: SPECIALIST_BIRTH_DATE_MIN_VALUE.year,
      maxYear: new Date().getFullYear(),
      year: initialState.specialistBirthDate
        ? parseDatePickerValue(initialState.specialistBirthDate)?.year ?? new Date().getFullYear()
        : new Date().getFullYear(),
    }));
    setSpecialistTelegramUrl(initialState.specialistTelegramUrl);
    setSpecialistMaxUrl(initialState.specialistMaxUrl);
    setSpecialistWhatsappUrl(initialState.specialistWhatsappUrl);
    setWorkTopics(initialState.workTopics);
    setErrorMessage(EMPTY_ERROR);
    setSubmittedMessage(null);
    setFormErrors(EMPTY_FORM_ERRORS);
    setIsSaving(false);
    setSpecialistTab("general");
    setRequiredFieldWasFilled({});
  }, [defaultRole, initialUser, isOpen]);

  // In embedded mode there is no Modal wrapper to handle keyboard events,
  // so we need to intercept Escape manually.
  useEffect(() => {
    if (!isOpen || !embedded) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [embedded, isOpen, isSaving, onClose]);

  if (!isOpen || (!embedded && !isMounted)) {
    return null;
  }

  const title = isEditing
    ? "Редактировать аккаунт"
    : defaultRole === "specialist"
      ? "Добавить специалиста"
      : "Добавить пользователя";
  const resolvedTitle = titleOverride ?? title;

  function handleSpecialtiesValueChange(keys: Array<string | number>) {
    const selectedKeySet = new Set(keys.map(String));
    const nextSpecialties = ADMIN_SPECIALTY_OPTIONS.filter((specialty) =>
      selectedKeySet.has(specialty));

    if (
      nextSpecialties.length > ADMIN_SPECIALTY_MAX_SELECTED
      && nextSpecialties.length > specialties.length
    ) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        specialties: SPECIALTY_LIMIT_ERROR,
      }));
      return;
    }

    setSpecialties(nextSpecialties);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      specialties: nextSpecialties.length > ADMIN_SPECIALTY_MAX_SELECTED
        ? SPECIALTY_LIMIT_ERROR
        : undefined,
    }));
  }

  function removeSpecialty(specialty: string) {
    setSpecialties((currentValues) =>
      currentValues.filter((currentSpecialty) => currentSpecialty !== specialty),
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      specialties: undefined,
    }));
  }

  function handleWorkTopicsValueChange(keys: Array<string | number>) {
    const selectedKeySet = new Set(keys.map(String));

    setWorkTopics(
      SPECIALIST_WORK_TOPIC_OPTIONS.filter((workTopic) => selectedKeySet.has(workTopic)),
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      workTopics: undefined,
    }));
  }

  function removeWorkTopic(workTopic: string) {
    setWorkTopics((currentValues) =>
      currentValues.filter((currentWorkTopic) => currentWorkTopic !== workTopic),
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      workTopics: undefined,
    }));
  }

  function addEducationItem() {
    if (education.length >= SPECIALIST_EDUCATION_MAX_ITEMS) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        education: `Добавьте не больше ${SPECIALIST_EDUCATION_MAX_ITEMS} записей.`,
      }));
      return;
    }

    setEducation((currentEducation) => [
      ...currentEducation,
      {
        year: "",
        institution: "",
      },
    ]);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      education: undefined,
    }));
  }

  function updateEducationItem(
    index: number,
    fieldName: keyof SpecialistEducationItem,
    value: string,
  ) {
    setEducation((currentEducation) =>
      currentEducation.map((item, itemIndex) => (
        itemIndex === index
          ? {
              ...item,
              [fieldName]: value,
            }
          : item
      )),
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      education: undefined,
    }));
  }

  function removeEducationItem(index: number) {
    setEducation((currentEducation) =>
      currentEducation.filter((_, itemIndex) => itemIndex !== index),
    );
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      education: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: AdminUserEditorFormErrors = {};

    if (!isEditing) {
      if (!email.trim()) {
        nextErrors.email = REQUIRED_FIELD_ERROR;
      }
    }

    const normalizedNickname = normalizeAdminAccountName(nickname);
    const nicknameError = hideNickname
      ? null
      : !normalizedNickname
        ? REQUIRED_FIELD_ERROR
        : getAdminAccountNameError(normalizedNickname);

    if (role === "user") {
      const displayNameError = !displayName.trim()
        ? REQUIRED_FIELD_ERROR
        : getAdminUserNameError(displayName);

      if (displayNameError) {
        nextErrors.displayName = displayNameError;
      }
    } else {
      if (!firstName.trim()) {
        nextErrors.firstName = "Введите имя";
      }

      if (!lastName.trim()) {
        nextErrors.lastName = "Введите фамилию";
      }

      if (patronymic.length > ADMIN_USER_NAME_MAX_LENGTH) {
        nextErrors.patronymic = `Отчество должно быть не длиннее ${ADMIN_USER_NAME_MAX_LENGTH} символов`;
      }

      if (!specialistGender) {
        nextErrors.specialistGender = "Выберите пол";
      }

      if (!specialistBirthDate) {
        nextErrors.specialistBirthDate = "Выберите дату рождения";
      }

      if (shouldValidateProfessionalFields) {
        if (specialties.length === 0) {
          nextErrors.specialties = "Выберите хотя бы один подход";
        } else if (specialties.length > ADMIN_SPECIALTY_MAX_SELECTED) {
          nextErrors.specialties = SPECIALTY_LIMIT_ERROR;
        }

        if (!avatarSourceUrl) {
          nextErrors.avatarUrl = "Добавьте фото";
        }

        if (!profileDescription.trim()) {
          nextErrors.profileDescription = "Заполните описание";
        }

        if (education.length === 0) {
          nextErrors.education = "Добавьте образование";
        } else if (education.some((item) => !item.year.trim() || !item.institution.trim())) {
          nextErrors.education = "Заполните год и учебное учреждение";
        }

        if (workTopics.length === 0) {
          nextErrors.workTopics = "Выберите хотя бы одну тему";
        }
      }
    }

    if (nicknameError) {
      nextErrors.nickname = nicknameError;
    }

    setFormErrors(nextErrors);

    if (role === "specialist" && Object.keys(nextErrors).length > 0) {
      const hasGeneralErrors = Boolean(
        nextErrors.email
        || nextErrors.firstName
        || nextErrors.lastName
        || nextErrors.patronymic
        || (!hideNickname && nextErrors.nickname)
        || nextErrors.specialistGender
        || nextErrors.specialistBirthDate,
      );

      setSpecialistTab(hasGeneralErrors ? "general" : "professional");
    }

    return Object.keys(nextErrors).length === 0;
  }

  function setRequiredFieldError(fieldName: AdminManagedUserFieldErrorName, value: string) {
    if (!value.trim() && !requiredFieldWasFilled[fieldName]) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        [fieldName]: undefined,
      }));
      return;
    }

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: value.trim() ? undefined : REQUIRED_FIELD_ERROR,
    }));
  }

  function renderEmailField({ disabled = false }: { disabled?: boolean } = {}) {
    return (
      <TextInputField
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        disabled={disabled}
        disablePasswordManagerHints
        error={disabled ? undefined : formErrors.email}
        inputMode="email"
        label="Email"
        onBlur={disabled ? undefined : (value) => setRequiredFieldError("email", value)}
        spellCheck={false}
        type="email"
        value={email}
        onChange={disabled
          ? () => {}
          : (value) => {
              const hasValue = value.trim().length > 0;
              setRequiredFieldWasFilled((currentState) => (
                hasValue
                  ? {
                      ...currentState,
                      email: true,
                    }
                  : currentState
              ));
              setEmail(value);
              setFormErrors((currentErrors) => ({
                ...currentErrors,
                email:
                  !hasValue && requiredFieldWasFilled.email
                    ? REQUIRED_FIELD_ERROR
                    : undefined,
              }));
            }}
        placeholder="name@example.com"
      />
    );
  }

  function handleSpecialistBirthDatePickerOpenChange(isNextOpen: boolean) {
    setIsSpecialistBirthDatePickerOpen(isNextOpen);
    setSpecialistBirthDateDraft(specialistBirthDate);
    setIsSpecialistBirthDateMonthPickerOpen(false);
    setIsSpecialistBirthDateYearPickerOpen(false);
  }

  function handleSpecialistBirthDateCancel() {
    setSpecialistBirthDateDraft(specialistBirthDate);
    setIsSpecialistBirthDateMonthPickerOpen(false);
    setIsSpecialistBirthDateYearPickerOpen(false);
    setIsSpecialistBirthDatePickerOpen(false);
  }

  function handleSpecialistBirthDateConfirm() {
    if (!specialistBirthDateDraft) {
      return;
    }

    setSpecialistBirthDate(specialistBirthDateDraft);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      specialistBirthDate: undefined,
    }));
    setIsSpecialistBirthDateMonthPickerOpen(false);
    setIsSpecialistBirthDateYearPickerOpen(false);
    setIsSpecialistBirthDatePickerOpen(false);
  }

  function handleUserAccountNameChange(value: string) {
    const normalizedValue = normalizeAdminAccountName(value);
    const nextError = normalizedValue
      ? getAdminAccountNameError(normalizedValue)
      : undefined;

    setNickname(normalizedValue);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      nickname: nextError ?? undefined,
    }));
  }

  function mapRequestErrorMessage(message: string) {
    const normalizedMessage = message.trim().toLowerCase();

    if (!normalizedMessage) {
      return "Не удалось сохранить";
    }

    if (normalizedMessage.includes("access denied")) {
      return "Доступ закрыт";
    }

    if (normalizedMessage.includes("failed to fetch")) {
      return "Нет соединения";
    }

    return message;
  }

  async function buildAvatarPayload() {
    if (!avatarSourceUrl) {
      return {
        avatarCardUrl: null,
        avatarSourceUrl: null,
        avatarUrl: null,
      };
    }

    const avatarUrl = await buildCroppedImageDataUrl({
      crop: avatarSquareCrop,
      outputHeight: 512,
      outputWidth: 512,
      sourceImage: avatarSourceUrl,
    });

    return {
      avatarCardUrl: null,
      avatarSourceUrl,
      avatarUrl,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(EMPTY_ERROR);
    setSubmittedMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const avatarPayload = await buildAvatarPayload();
      const basePayload = {
        ...avatarPayload,
        displayName: role === "user" ? displayName.trim() : undefined,
        firstName: role === "specialist" ? firstName : undefined,
        lastName: role === "specialist" ? lastName : undefined,
        patronymic: role === "specialist" ? patronymic : null,
        ...(hideNickname ? {} : { nickname: normalizeAdminAccountName(nickname) }),
        profileDescription,
        education: role === "specialist" ? education : [],
        role,
        specialties: role === "specialist" ? specialties : [],
        specialistGender: role === "specialist" ? specialistGender : null,
        specialistBirthDate: role === "specialist" ? specialistBirthDate : null,
        specialistPhoneCountry: null,
        specialistPhoneNumber: null,
        specialistTelegramUrl: role === "specialist" ? specialistTelegramUrl : null,
        specialistMaxUrl: role === "specialist" ? specialistMaxUrl : null,
        specialistWhatsappUrl: role === "specialist" ? specialistWhatsappUrl : null,
        workTopics: role === "specialist" ? workTopics : [],
      };

      const requestUrl = submitEndpoint
        ?? (isEditing ? `/api/admin/users/${initialUser?.id}` : "/api/admin/users");
      const response = await fetch(
        requestUrl,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? basePayload
              : {
                  ...basePayload,
                  email,
                },
          ),
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        fieldErrors?: AdminUserEditorFormErrors;
        user?: AdminListedUser;
      };

      if (!response.ok) {
        if (payload.fieldErrors) {
          setFormErrors(payload.fieldErrors);
          setErrorMessage(EMPTY_ERROR);
          return;
        }

        throw new Error(payload.error ?? "Не удалось сохранить аккаунт.");
      }

      if (payload.user) {
        onSaved?.(payload.user);
      }
      router.refresh();
      if (successMessage) {
        setSubmittedMessage(successMessage);
        return;
      }
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? mapRequestErrorMessage(error.message)
          : "Не удалось сохранить",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const specialistBirthDateValue = parseDatePickerValue(specialistBirthDate);
  const specialistBirthDateDraftValue = parseDatePickerValue(specialistBirthDateDraft);
  const specialistBirthDatePickerValue = isSpecialistBirthDatePickerOpen
    ? specialistBirthDateDraftValue
    : specialistBirthDateValue;
  const specialistBirthDateDisplayValue = formatDatePickerDisplayValue(
    isSpecialistBirthDatePickerOpen ? specialistBirthDateDraft : specialistBirthDate,
  );
  const specialistBirthDateMaxValue = today(getLocalTimeZone());
  const isSpecialistEditor = role === "specialist";
  const specialistTabsSelectedKey = hideProfessionalSection ? "general" : specialistTab;
  const specialistGeneralPanelClassName = hideProfessionalSection
    ? "grid gap-8 !px-0 !pb-0 pt-0"
    : "grid gap-8 !px-0 !pb-0 pt-8";

  const innerContent = (
    <>
      {!embedded ? (
        <IconButton
          className="absolute right-3 top-3 text-[var(--label-primary)]"
          label="Закрыть"
          onClick={() => {
            if (!isSaving) {
              onClose();
            }
          }}
          icon={<CloseIcon />}
        />
      ) : null}

      {embedded ? (
        <div className="flex items-center gap-3 pr-10">
          {onBack ? (
            <BackNavigationButton
              onClick={() => {
                if (!isSaving) {
                  onBack();
                }
              }}
            />
          ) : null}
          <h2
            id="admin-user-editor-title"
            className="type-h2 font-bold text-[var(--label-primary)]"
          >
            {resolvedTitle}
          </h2>
        </div>
      ) : (
        <div className="pr-10">
          <h2
            id="admin-user-editor-title"
            className="type-h2 font-bold text-[var(--label-primary)]"
          >
            {resolvedTitle}
          </h2>
        </div>
      )}

      {submittedMessage ? (
        <div className="mt-6 rounded-[20px] bg-[var(--color-accent-soft)] px-4 py-3 text-[16px] leading-6 text-[var(--accent-primary)]">
          {submittedMessage}
        </div>
      ) : null}

      <form
        className={cn(
          "mt-6",
          isSpecialistEditor
            ? "flex min-h-0 flex-1 flex-col gap-0"
            : "grid gap-8",
        )}
        onSubmit={handleSubmit}
      >
        <div
          className={isSpecialistEditor
            ? "min-h-0 flex-1 overflow-y-auto px-1 pb-6"
            : "contents"}
        >
          {role === "user" ? (
            <section className="grid gap-8">
              <div className="grid grid-cols-2 items-start gap-4">
                <TextInputField
                  counter={`${displayName.length}/${ADMIN_USER_NAME_MAX_LENGTH}`}
                  error={formErrors.displayName}
                  label="Имя"
                  maxLength={ADMIN_USER_NAME_MAX_LENGTH}
                  onBlur={(value) => setRequiredFieldError("displayName", value)}
                  value={displayName}
                  onChange={(value) => {
                    const hasValue = value.trim().length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            displayName: true,
                          }
                        : currentState
                    ));
                    setDisplayName(value);
                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      displayName:
                        !hasValue && requiredFieldWasFilled.displayName
                          ? REQUIRED_FIELD_ERROR
                          : undefined,
                    }));
                  }}
                  placeholder="Имя пользователя"
                />

                <TextInputField
                  autoCapitalize="none"
                  autoCorrect="off"
                  counter={`${nickname.length}/${ADMIN_ACCOUNT_NAME_MAX_LENGTH}`}
                  error={formErrors.nickname}
                  inputMode="text"
                  label="Имя аккаунта"
                  maxLength={ADMIN_ACCOUNT_NAME_MAX_LENGTH}
                  onBlur={(value) => {
                    if (!value.trim()) {
                      if (!requiredFieldWasFilled.nickname) {
                        setFormErrors((currentErrors) => ({
                          ...currentErrors,
                          nickname: undefined,
                        }));
                        return;
                      }

                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        nickname: REQUIRED_FIELD_ERROR,
                      }));
                      return;
                    }

                    setFormErrors((currentErrors) => ({
                      ...currentErrors,
                      nickname: getAdminAccountNameError(value) ?? undefined,
                    }));
                  }}
                  prefix="@"
                  spellCheck={false}
                  value={nickname}
                  onChange={(value) => {
                    const normalizedValue = normalizeAdminAccountName(value);
                    const hasValue = normalizedValue.length > 0;
                    setRequiredFieldWasFilled((currentState) => (
                      hasValue
                        ? {
                            ...currentState,
                            nickname: true,
                          }
                        : currentState
                    ));

                    if (!hasValue && requiredFieldWasFilled.nickname) {
                      setNickname(normalizedValue);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        nickname: REQUIRED_FIELD_ERROR,
                      }));
                      return;
                    }

                    handleUserAccountNameChange(value);
                  }}
                  placeholder="username"
                />
              </div>

              <TextareaField
                label="Описание профиля"
                helper={(
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {profileDescription.length}/{USER_DESCRIPTION_LIMIT}
                  </span>
                )}
                maxLength={USER_DESCRIPTION_LIMIT}
                minHeightClassName="min-h-[132px]"
                value={profileDescription}
                onChange={setProfileDescription}
                placeholder="Короткое описание пользователя"
              />

              <ImageUploadCropField
                aspectRatio="1:1"
                label="Фото"
                helperText=""
                isActionListHidden
                sourceImage={avatarSourceUrl}
                previewVariant="avatar"
                value={avatarSquareCrop}
                outputHeight={512}
                outputWidth={512}
                onSourceImageChange={(nextImage) => {
                  setAvatarSourceUrl(nextImage);
                  setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                }}
                onValueChange={setAvatarSquareCrop}
                onClear={() => {
                  setAvatarSourceUrl(null);
                  setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                {renderEmailField({ disabled: isEditing })}
              </div>
            </section>
          ) : (
            <section className="grid gap-8">
              <Tabs
                selectedKey={specialistTabsSelectedKey}
                onSelectionChange={(key) => {
                  if (!hideProfessionalSection) {
                    setSpecialistTab(String(key) as SpecialistEditorTab);
                  }
                }}
                className="w-full gap-0"
              >
                <Tabs.ListContainer className={hideProfessionalSection ? "sr-only" : undefined}>
                  <Tabs.List aria-label="Разделы информации специалиста">
                    <Tabs.Tab key="general" id="general" className="h-10 text-[16px] leading-6">
                      Общее
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    {!hideProfessionalSection ? (
                      <Tabs.Tab key="professional" id="professional" className="h-10 text-[16px] leading-6">
                        <Tabs.Separator />
                        Профессиональное
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    ) : null}
                  </Tabs.List>
                </Tabs.ListContainer>

                <Tabs.Panel key="general" id="general" className={specialistGeneralPanelClassName}>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <TextInputField
                        error={formErrors.lastName}
                        label="Фамилия"
                        value={lastName}
                        onChange={(value) => {
                          setLastName(value);
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            lastName: undefined,
                          }));
                        }}
                        placeholder="Иванов"
                      />

                      <TextInputField
                        error={formErrors.firstName}
                        label="Имя"
                        value={firstName}
                        onChange={(value) => {
                          setFirstName(value);
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            firstName: undefined,
                          }));
                        }}
                        placeholder="Иван"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <TextInputField
                        error={formErrors.patronymic}
                        label="Отчество"
                        value={patronymic}
                        onChange={(value) => {
                          setPatronymic(value);
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            patronymic: undefined,
                          }));
                        }}
                        placeholder="Иванович"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 text-sm">
                    <span className={fieldControlLabelClassName}>
                      Пол
                    </span>
                    <Select
                      aria-label="Пол психолога"
                      selectedKey={specialistGender ?? undefined}
                      onSelectionChange={(nextKey) => {
                        if (typeof nextKey !== "string") {
                          return;
                        }

                        setSpecialistGender(nextKey as SpecialistGender);
                        setFormErrors((currentErrors) => ({
                          ...currentErrors,
                          specialistGender: undefined,
                        }));
                      }}
                      className="w-full"
                    >
                      <Select.Trigger
                        data-invalid={formErrors.specialistGender ? "true" : undefined}
                        className={fieldControlSelectTriggerClassName}
                      >
                        <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                          <span
                            className={specialistGender
                              ? "min-w-0 truncate text-[var(--label-primary)]"
                              : "min-w-0 truncate text-[var(--label-quaternary)]"}
                          >
                            {SPECIALIST_GENDER_OPTIONS.find(
                              (option) => option.value === specialistGender,
                            )?.label ?? "Выберите пол"}
                          </span>
                        </Select.Value>
                        <Select.Indicator className="right-4 text-[var(--label-quaternary)]" />
                      </Select.Trigger>

                      <Select.Popover placement="bottom start">
                        <ListBox
                          aria-label="Пол психолога"
                          className="dropdown-menu-default text-[16px] leading-6"
                        >
                          <ListBox.Section>
                            {SPECIALIST_GENDER_OPTIONS.map((option) => (
                              <ListBox.Item
                                key={option.value}
                                id={option.value}
                                textValue={option.label}
                                className={fieldControlSelectItemClassName}
                              >
                                <span className="flex min-w-0 items-center gap-3">
                                  <span className="min-w-0 flex-1 truncate font-normal">
                                    {option.label}
                                  </span>
                                  <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                                    {({ isSelected }) => (
                                      isSelected ? <CheckIndicatorIcon /> : null
                                    )}
                                  </ListBox.ItemIndicator>
                                </span>
                              </ListBox.Item>
                            ))}
                          </ListBox.Section>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {formErrors.specialistGender ? (
                      <p className="text-[14px] text-[var(--danger)]">
                        {formErrors.specialistGender}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-sm">
                    <span className={fieldControlLabelClassName}>
                      Дата рождения
                    </span>
                    <DatePicker
                      aria-label="Дата рождения психолога"
                      value={specialistBirthDatePickerValue}
                      isOpen={isSpecialistBirthDatePickerOpen}
                      minValue={SPECIALIST_BIRTH_DATE_MIN_VALUE}
                      maxValue={specialistBirthDateMaxValue}
                      isInvalid={Boolean(formErrors.specialistBirthDate)}
                      shouldCloseOnSelect={false}
                      onOpenChange={handleSpecialistBirthDatePickerOpenChange}
                      onChange={(nextDate) => {
                        const nextValue = nextDate ? nextDate.toString() : null;

                        if (isSpecialistBirthDatePickerOpen) {
                          setSpecialistBirthDateDraft(nextValue);
                          return;
                        }

                        setSpecialistBirthDate(nextValue);
                        if (nextValue) {
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            specialistBirthDate: undefined,
                          }));
                        }
                      }}
                      className="w-full"
                    >
                      <DatePicker.Trigger
                        ref={specialistBirthDateTriggerRef}
                        aria-label="Открыть календарь даты рождения"
                        className={fieldControlDateTriggerClassName}
                        data-invalid={formErrors.specialistBirthDate ? "true" : undefined}
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-left",
                            specialistBirthDateDisplayValue
                              ? "text-[var(--label-primary)]"
                              : "text-[var(--label-quaternary)]",
                          )}
                        >
                          {specialistBirthDateDisplayValue || "01.08.1974"}
                        </span>
                        <DatePicker.TriggerIndicator className="size-5 flex-none text-[var(--label-quaternary)]" />
                      </DatePicker.Trigger>

                      <DatePicker.Popover
                        placement="bottom start"
                        triggerRef={specialistBirthDateTriggerRef}
                        shouldFlip={false}
                        className="field-control-date-popover"
                      >
                        <Calendar
                          minValue={SPECIALIST_BIRTH_DATE_MIN_VALUE}
                          maxValue={specialistBirthDateMaxValue}
                          isYearPickerOpen={isSpecialistBirthDateYearPickerOpen}
                          onYearPickerOpenChange={(isNextOpen) => {
                            setIsSpecialistBirthDateYearPickerOpen(isNextOpen);
                            if (isNextOpen) {
                              setSpecialistBirthDateYearPageStart(
                                getSpecialistBirthDateYearPageStart({
                                  minYear: SPECIALIST_BIRTH_DATE_MIN_VALUE.year,
                                  maxYear: specialistBirthDateMaxValue.year,
                                  year: specialistBirthDatePickerValue?.year
                                    ?? specialistBirthDateMaxValue.year,
                                }),
                              );
                              setIsSpecialistBirthDateMonthPickerOpen(false);
                            }
                          }}
                        >
                          <Calendar.Header className="flex items-center gap-2 px-0 pb-2">
                            <SpecialistBirthDateMonthPickerTrigger
                              isOpen={isSpecialistBirthDateMonthPickerOpen}
                              onPress={() => {
                                const isNextOpen = !isSpecialistBirthDateMonthPickerOpen;
                                setIsSpecialistBirthDateMonthPickerOpen(isNextOpen);
                                if (isNextOpen) {
                                  setIsSpecialistBirthDateYearPickerOpen(false);
                                }
                              }}
                            />
                            <SpecialistBirthDateYearPickerTrigger
                              isOpen={isSpecialistBirthDateYearPickerOpen}
                              onPress={() => {
                                const isNextOpen = !isSpecialistBirthDateYearPickerOpen;
                                setIsSpecialistBirthDateYearPickerOpen(isNextOpen);
                                if (isNextOpen) {
                                  setSpecialistBirthDateYearPageStart(
                                    getSpecialistBirthDateYearPageStart({
                                      minYear: SPECIALIST_BIRTH_DATE_MIN_VALUE.year,
                                      maxYear: specialistBirthDateMaxValue.year,
                                      year: specialistBirthDatePickerValue?.year
                                        ?? specialistBirthDateMaxValue.year,
                                    }),
                                  );
                                  setIsSpecialistBirthDateMonthPickerOpen(false);
                                }
                              }}
                            />
                            {isSpecialistBirthDateMonthPickerOpen ? (
                              <div className="flex items-center gap-0">
                                <SpecialistBirthDateMonthPickerYearNavButton
                                  direction="previous"
                                  minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                                  minMonth={SPECIALIST_BIRTH_DATE_MIN_VALUE.month}
                                  maxYear={specialistBirthDateMaxValue.year}
                                  maxMonth={specialistBirthDateMaxValue.month}
                                />
                                <SpecialistBirthDateMonthPickerYearNavButton
                                  direction="next"
                                  minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                                  minMonth={SPECIALIST_BIRTH_DATE_MIN_VALUE.month}
                                  maxYear={specialistBirthDateMaxValue.year}
                                  maxMonth={specialistBirthDateMaxValue.month}
                                />
                              </div>
                            ) : isSpecialistBirthDateYearPickerOpen ? (
                              <div className="flex items-center gap-0">
                                <SpecialistBirthDateYearPickerPageNavButton
                                  direction="previous"
                                  minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                                  maxYear={specialistBirthDateMaxValue.year}
                                  pageStart={specialistBirthDateYearPageStart}
                                  onPageStartChange={setSpecialistBirthDateYearPageStart}
                                />
                                <SpecialistBirthDateYearPickerPageNavButton
                                  direction="next"
                                  minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                                  maxYear={specialistBirthDateMaxValue.year}
                                  pageStart={specialistBirthDateYearPageStart}
                                  onPageStartChange={setSpecialistBirthDateYearPageStart}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-0">
                                <Calendar.NavButton
                                  slot="previous"
                                  className="size-8 text-[var(--label-secondary)]"
                                />
                                <Calendar.NavButton
                                  slot="next"
                                  className="size-8 text-[var(--label-secondary)]"
                                />
                              </div>
                            )}
                          </Calendar.Header>
                          {isSpecialistBirthDateMonthPickerOpen ? (
                            <SpecialistBirthDateMonthPicker
                              isOpen={isSpecialistBirthDateMonthPickerOpen}
                              minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                              minMonth={SPECIALIST_BIRTH_DATE_MIN_VALUE.month}
                              maxYear={specialistBirthDateMaxValue.year}
                              maxMonth={specialistBirthDateMaxValue.month}
                              onClose={() => setIsSpecialistBirthDateMonthPickerOpen(false)}
                            />
                          ) : isSpecialistBirthDateYearPickerOpen ? (
                            <SpecialistBirthDateYearPicker
                              minYear={SPECIALIST_BIRTH_DATE_MIN_VALUE.year}
                              minMonth={SPECIALIST_BIRTH_DATE_MIN_VALUE.month}
                              maxYear={specialistBirthDateMaxValue.year}
                              maxMonth={specialistBirthDateMaxValue.month}
                              pageStart={specialistBirthDateYearPageStart}
                              onClose={() => setIsSpecialistBirthDateYearPickerOpen(false)}
                            />
                          ) : (
                            <Calendar.Grid>
                              <Calendar.GridBody>
                                {(date) => (
                                  <Calendar.Cell date={date} />
                                )}
                              </Calendar.GridBody>
                            </Calendar.Grid>
                          )}
                        </Calendar>
                        <div className="grid w-full grid-cols-2 gap-2 pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full bg-[var(--color-accent-soft)] text-[var(--accent-primary)] hover:bg-[var(--color-accent-soft-hover)] data-[hovered=true]:bg-[var(--color-accent-soft-hover)]"
                            onPress={handleSpecialistBirthDateCancel}
                          >
                            Отменить
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="w-full"
                            disabled={!specialistBirthDateDraftValue}
                            onPress={handleSpecialistBirthDateConfirm}
                          >
                            Подтвердить
                          </Button>
                        </div>
                      </DatePicker.Popover>
                    </DatePicker>
                    {formErrors.specialistBirthDate ? (
                      <p className="text-[14px] text-[var(--danger)]">
                        {formErrors.specialistBirthDate}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {renderEmailField({ disabled: isEditing })}
                </div>

                {!hideNickname ? (
                  <div className="grid grid-cols-2 gap-4">
                    <TextInputField
                      autoCapitalize="none"
                      autoCorrect="off"
                      counter={`${nickname.length}/${ADMIN_ACCOUNT_NAME_MAX_LENGTH}`}
                      error={formErrors.nickname}
                      inputMode="text"
                      label="Никнейм"
                      maxLength={ADMIN_ACCOUNT_NAME_MAX_LENGTH}
                      onBlur={(value) => {
                        if (!value.trim()) {
                          if (!requiredFieldWasFilled.nickname) {
                            setFormErrors((currentErrors) => ({
                              ...currentErrors,
                              nickname: undefined,
                            }));
                            return;
                          }

                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            nickname: REQUIRED_FIELD_ERROR,
                          }));
                          return;
                        }

                        setFormErrors((currentErrors) => ({
                          ...currentErrors,
                          nickname: getAdminAccountNameError(value) ?? undefined,
                        }));
                      }}
                      prefix="@"
                      spellCheck={false}
                      value={nickname}
                      onChange={(value) => {
                        const normalizedValue = normalizeAdminAccountName(value);
                        const hasValue = normalizedValue.length > 0;
                        setRequiredFieldWasFilled((currentState) => (
                          hasValue
                            ? {
                                ...currentState,
                                nickname: true,
                              }
                            : currentState
                        ));

                        if (!hasValue && requiredFieldWasFilled.nickname) {
                          setNickname(normalizedValue);
                          setFormErrors((currentErrors) => ({
                            ...currentErrors,
                            nickname: REQUIRED_FIELD_ERROR,
                          }));
                          return;
                        }

                        handleUserAccountNameChange(value);
                      }}
                      placeholder="specialist"
                    />
                  </div>
                ) : null}
              </div>
              </Tabs.Panel>

              {!hideProfessionalSection ? (
              <Tabs.Panel key="professional" id="professional" className="grid gap-8 !px-0 !pb-0 pt-8">
                <section className="grid gap-3">
                  <ImageUploadCropField
                    aspectRatio="1:1"
                    label="Фото"
                    helperText=""
                    isActionListHidden
                    sourceImage={avatarSourceUrl}
                    previewVariant="avatar"
                    value={avatarSquareCrop}
                    outputHeight={512}
                    outputWidth={512}
                    onSourceImageChange={(nextImage) => {
                      setAvatarSourceUrl(nextImage);
                      setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        avatarUrl: undefined,
                      }));
                    }}
                    onValueChange={setAvatarSquareCrop}
                    onClear={() => {
                      setAvatarSourceUrl(null);
                      setAvatarSquareCrop(DEFAULT_IMAGE_CROP_VALUE);
                    }}
                  />
                  {formErrors.avatarUrl ? (
                    <p className="text-[14px] text-[var(--danger)]">
                      {formErrors.avatarUrl}
                    </p>
                  ) : null}
                </section>

              <section className="grid gap-3">
                <div className="grid gap-2 text-sm">
                  <span className={fieldControlLabelClassName}>
                    Психотерапевтические подходы
                  </span>
                  <Select.Root<object, "multiple">
                    aria-label="Психотерапевтические подходы"
                    selectionMode="multiple"
                    value={specialties}
                    onChange={handleSpecialtiesValueChange}
                    className="w-full"
                    placeholder="Выберите подходы"
                  >
                    <Select.Trigger
                      data-invalid={formErrors.specialties ? "true" : undefined}
                      className={fieldControlSelectTriggerClassName}
                    >
                      <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                        <span
                          className={specialties.length > 0
                            ? "min-w-0 truncate text-[var(--label-primary)]"
                            : "min-w-0 truncate text-[var(--label-quaternary)]"}
                        >
                          {specialties.length > 0
                            ? `Выбрано: ${specialties.length}/${ADMIN_SPECIALTY_MAX_SELECTED}`
                            : "Выберите подходы"}
                        </span>
                      </Select.Value>
                      <Select.Indicator className="right-4 text-[var(--label-quaternary)]" />
                    </Select.Trigger>

                    <Select.Popover placement="bottom start">
                      <ListBox
                        aria-label="Психотерапевтические подходы"
                        className="dropdown-menu-default max-h-[360px] overflow-y-auto text-[16px] leading-6"
                      >
                        <ListBox.Section>
                          {ADMIN_SPECIALTY_OPTIONS.map((specialty) => (
                            <ListBox.Item
                              key={specialty}
                              id={specialty}
                              isDisabled={
                                specialties.length >= ADMIN_SPECIALTY_MAX_SELECTED
                                && !specialties.includes(specialty)
                              }
                              textValue={specialty}
                              className={fieldControlSelectItemClassName}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span className="min-w-0 flex-1 truncate font-normal">
                                  {specialty}
                                </span>
                                <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                                  {({ isSelected }) => (
                                    isSelected ? <CheckIndicatorIcon /> : null
                                  )}
                                </ListBox.ItemIndicator>
                              </span>
                            </ListBox.Item>
                          ))}
                        </ListBox.Section>
                      </ListBox>
                    </Select.Popover>
                  </Select.Root>
                </div>

                {specialties.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {specialties.map((specialty) => (
                      <Chip
                        key={specialty}
                        color="default"
                        variant="soft"
                        className="gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 text-[var(--accent-primary)]"
                      >
                        <Chip.Label className="text-[16px] leading-6">
                          {specialty}
                        </Chip.Label>
                        <button
                          type="button"
                          aria-label={`Убрать ${specialty}`}
                          className="interactive-quaternary inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--accent-primary)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSpecialty(specialty);
                          }}
                        >
                          <span className="flex h-3 w-3 items-center justify-center">
                            <CrossSmallIcon />
                          </span>
                        </button>
                      </Chip>
                    ))}
                  </div>
                ) : null}

                {formErrors.specialties ? (
                  <p className="text-[14px] text-[var(--danger)]">
                    {formErrors.specialties}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3">
                <div className="grid gap-2 text-sm">
                  <span className={fieldControlLabelClassName}>
                    Работает с темами
                  </span>
                  <Select.Root<object, "multiple">
                    aria-label="Работает с темами"
                    selectionMode="multiple"
                    value={workTopics}
                    onChange={handleWorkTopicsValueChange}
                    className="w-full"
                    placeholder="Выберите подтемы"
                  >
                    <Select.Trigger
                      data-invalid={formErrors.workTopics ? "true" : undefined}
                      className={fieldControlSelectTriggerClassName}
                    >
                      <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                        <span
                          className={workTopics.length > 0
                            ? "min-w-0 truncate text-[var(--label-primary)]"
                            : "min-w-0 truncate text-[var(--label-quaternary)]"}
                        >
                          {workTopics.length > 0
                            ? `Выбрано: ${workTopics.length}`
                            : "Выберите подтемы"}
                        </span>
                      </Select.Value>
                      <Select.Indicator className="right-4 text-[var(--label-quaternary)]" />
                    </Select.Trigger>

                    <Select.Popover placement="bottom start">
                      <ListBox
                        aria-label="Работает с темами"
                        className="max-h-[360px] overflow-y-auto text-[16px] leading-6"
                      >
                        {SPECIALIST_WORK_TOPIC_GROUPS.map((workTopicGroup, workTopicGroupIndex) => (
                          <Fragment key={workTopicGroup.label}>
                            {workTopicGroupIndex > 0 ? (
                              <Separator />
                            ) : null}
                            <ListBox.Section
                              aria-label={workTopicGroup.label}
                            >
                              <Header className="px-4 text-[var(--label-tertiary)]">
                                {workTopicGroup.label}
                              </Header>
                              {workTopicGroup.subtopics.map((workTopic) => (
                                <ListBox.Item
                                  key={workTopic}
                                  id={workTopic}
                                  textValue={workTopic}
                                  className={fieldControlSelectItemClassName}
                                >
                                  <span className="flex min-w-0 items-center gap-3">
                                    <span className="min-w-0 flex-1 truncate font-normal">
                                      {workTopic}
                                    </span>
                                    <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                                      {({ isSelected }) => (
                                        isSelected ? <CheckIndicatorIcon /> : null
                                      )}
                                    </ListBox.ItemIndicator>
                                  </span>
                                </ListBox.Item>
                              ))}
                            </ListBox.Section>
                          </Fragment>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select.Root>
                </div>

                {workTopics.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {workTopics.map((workTopic) => (
                      <Chip
                        key={workTopic}
                        color="default"
                        variant="soft"
                        className="gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 text-[var(--accent-primary)]"
                      >
                        <Chip.Label className="text-[16px] leading-6">
                          {workTopic}
                        </Chip.Label>
                        <button
                          type="button"
                          aria-label={`Убрать ${workTopic}`}
                          className="interactive-quaternary inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--accent-primary)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeWorkTopic(workTopic);
                          }}
                        >
                          <span className="flex h-3 w-3 items-center justify-center">
                            <CrossSmallIcon />
                          </span>
                        </button>
                      </Chip>
                    ))}
                  </div>
                ) : null}

                {formErrors.workTopics ? (
                  <p className="text-[14px] text-[var(--danger)]">
                    {formErrors.workTopics}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={fieldControlLabelClassName}>
                    Образование
                  </span>
                  <Button
                    type="button"
                    variant="quaternary"
                    size="sm"
                    className="text-[var(--accent-primary)]"
                    onClick={addEducationItem}
                    disabled={education.length >= SPECIALIST_EDUCATION_MAX_ITEMS}
                  >
                    Добавить
                  </Button>
                </div>

                {education.length > 0 ? (
                  <div className="grid gap-4">
                    {education.map((item, index) => (
                      <div
                        key={`education-${index}`}
                        className="relative grid gap-3 rounded-[18px] bg-[var(--fill-quaternary)] p-3"
                      >
                        <button
                          type="button"
                          className="interactive-quaternary absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--label-secondary)]"
                          aria-label={`Удалить запись ${index + 1}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeEducationItem(index);
                          }}
                        >
                          <CloseIcon />
                        </button>

                        <div className="grid gap-3 pr-10">
                          <TextField className="grid w-[200px] min-w-0 gap-2 text-sm">
                            <Label className={fieldControlLabelClassName}>
                              Год
                            </Label>
                            <Select
                              aria-label={`Год записи ${index + 1}`}
                              selectedKey={item.year || undefined}
                              onSelectionChange={(nextKey) => {
                                if (typeof nextKey !== "string") {
                                  return;
                                }

                                updateEducationItem(index, "year", nextKey);
                              }}
                              className="w-[200px]"
                            >
                              <Select.Trigger
                                data-invalid={
                                  formErrors.education && !item.year.trim()
                                    ? "true"
                                    : undefined
                                }
                                className={fieldControlSelectTriggerClassName}
                              >
                                <Select.Value className="min-w-0 text-[16px] font-normal leading-6">
                                  <span
                                    className={item.year
                                      ? "min-w-0 truncate text-[var(--label-primary)]"
                                      : "min-w-0 truncate text-[var(--label-quaternary)]"}
                                  >
                                    {item.year || "Выберите год"}
                                  </span>
                                </Select.Value>
                                <Select.Indicator className="right-4 text-[var(--label-quaternary)]" />
                              </Select.Trigger>

                              <Select.Popover placement="bottom start">
                                <ListBox
                                  aria-label={`Год записи ${index + 1}`}
                                  className="dropdown-menu-default max-h-[320px] overflow-y-auto text-[16px] leading-6"
                                >
                                  <ListBox.Section>
                                    {EDUCATION_YEAR_OPTIONS.map((yearOption) => (
                                      <ListBox.Item
                                        key={yearOption}
                                        id={yearOption}
                                        textValue={yearOption}
                                        className={fieldControlSelectItemClassName}
                                      >
                                        <span className="flex min-w-0 items-center gap-3">
                                          <span className="min-w-0 flex-1 truncate font-normal">
                                            {yearOption}
                                          </span>
                                          <ListBox.ItemIndicator className={fieldControlSelectItemIndicatorClassName}>
                                            {({ isSelected }) => (
                                              isSelected ? <CheckIndicatorIcon /> : null
                                            )}
                                          </ListBox.ItemIndicator>
                                        </span>
                                      </ListBox.Item>
                                    ))}
                                  </ListBox.Section>
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </TextField>

                          <TextField className="grid min-w-0 gap-2 text-sm">
                            <Label className={fieldControlLabelClassName}>
                              Учебное учреждение
                            </Label>
                            <TextArea
                              rows={2}
                              value={item.institution}
                              maxLength={SPECIALIST_EDUCATION_INSTITUTION_MAX_LENGTH}
                              onChange={(event) => updateEducationItem(index, "institution", event.target.value)}
                              placeholder="Название учреждения, программа, квалификация"
                              className="min-h-[72px] w-full min-w-0 resize-none rounded-[16px] py-3 text-[16px] leading-6"
                            />
                          </TextField>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] leading-5 text-[var(--label-tertiary)]">
                    Добавьте учебные учреждения, которые будут показаны в профиле специалиста.
                  </p>
                )}

                {formErrors.education ? (
                  <p className="text-[14px] text-[var(--danger)]">
                    {formErrors.education}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3">
                <span className={fieldControlLabelClassName}>
                  Контакты
                </span>
                <div className="grid grid-cols-3 gap-4">
                  <TextInputField
                    autoCapitalize="none"
                    autoCorrect="off"
                    error={formErrors.specialistTelegramUrl}
                    inputMode="url"
                    label="Telegram"
                    onChange={(value) => {
                      setSpecialistTelegramUrl(value);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        specialistTelegramUrl: undefined,
                      }));
                    }}
                    placeholder="https://t.me/username"
                    spellCheck={false}
                    value={specialistTelegramUrl}
                  />

                  <TextInputField
                    autoCapitalize="none"
                    autoCorrect="off"
                    error={formErrors.specialistMaxUrl}
                    inputMode="url"
                    label="Max"
                    onChange={(value) => {
                      setSpecialistMaxUrl(value);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        specialistMaxUrl: undefined,
                      }));
                    }}
                    placeholder="https://max.ru/username"
                    spellCheck={false}
                    value={specialistMaxUrl}
                  />

                  <TextInputField
                    autoCapitalize="none"
                    autoCorrect="off"
                    error={formErrors.specialistWhatsappUrl}
                    inputMode="url"
                    label="WhatsApp"
                    onChange={(value) => {
                      setSpecialistWhatsappUrl(value);
                      setFormErrors((currentErrors) => ({
                        ...currentErrors,
                        specialistWhatsappUrl: undefined,
                      }));
                    }}
                    placeholder="https://wa.me/79990000000"
                    spellCheck={false}
                    value={specialistWhatsappUrl}
                  />
                </div>
              </section>

              <TextareaField
                error={formErrors.profileDescription}
                label="О специалисте"
                helper={(
                  <span className="text-[12px] font-medium text-[var(--label-tertiary)]">
                    {profileDescription.length}/{SPECIALIST_DESCRIPTION_LIMIT}
                  </span>
                )}
                maxLength={SPECIALIST_DESCRIPTION_LIMIT}
                minHeightClassName="min-h-[150px]"
                value={profileDescription}
                onChange={(value) => {
                  setProfileDescription(value);
                  setFormErrors((currentErrors) => ({
                    ...currentErrors,
                    profileDescription: undefined,
                  }));
                }}
                placeholder="Краткое описание специалиста"
              />

              </Tabs.Panel>
              ) : null}
            </Tabs>
            </section>
          )}
        </div>

        <div
          className={isSpecialistEditor
            ? "-mx-6 flex w-[calc(100%+48px)] flex-none flex-col gap-4 border-t border-[var(--separator-primary)] px-6 pt-4"
            : "contents"}
        >
          {errorMessage ? (
            <p className="text-sm text-[var(--danger)]">{errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              isLoading={isSaving}
            >
              {submitButtonLabel ?? (isEditing ? "Сохранить изменения" : "Создать аккаунт")}
            </Button>
          </div>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div className="w-full">{innerContent}</div>;
  }

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      variant="opaque"
      isDismissable={!isSaving}
      onClick={(event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest(modalInternalPortalSelector)) return;
        if (!isSaving) onClose();
      }}
      className="fixed inset-0 z-[220]"
    >
      <Modal.Container scroll="outside" className="!p-4">
        <Modal.Dialog
          aria-label={title}
          className={cn(
            "modal-surface relative w-full max-w-[720px] p-6",
            isSpecialistEditor
              ? "flex h-[calc(100dvh-32px)] max-h-[820px] flex-col"
              : "",
          )}
        >
          {innerContent}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
