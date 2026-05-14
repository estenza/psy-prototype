/* eslint-disable @next/next/no-img-element */

"use client";

import {
  ErrorMessage,
  Input,
  InputOTP,
  REGEXP_ONLY_DIGITS,
  Tabs,
  cn,
} from "@heroui/react";
import { Drawer } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  InputHTMLAttributes,
  PointerEvent,
  RefObject,
  ReactNode,
} from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/button-styles";
import {
  SelectField,
  fieldControlInputClassName,
  fieldControlLabelClassName,
} from "@/components/ui/field-control";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIndicatorIcon,
  ChevronDownIcon,
  CloseIcon,
  VerifiedSpecialistIcon,
} from "@/components/ui/icons";
import { EMAIL_PATTERN } from "@/features/auth/constants";
import type { AdminManagedUserErrorResponse } from "@/features/admin/types";
import type {
  SpecialistApplicationStatus,
  SpecialistAttachedDocument,
  SpecialistEducationItem,
  SpecialistGender,
} from "@/features/auth/types";
import {
  DEFAULT_SPECIALIST_PHONE_COUNTRY,
  type SpecialistPhoneCountryCode,
} from "@/features/specialists/lib/specialist-phone";
import { THERAPEUTIC_APPROACH_OPTIONS } from "@/features/specialists/lib/therapeutic-approaches";

type FlowScreen =
  | "general"
  | "contact"
  | ApplicationStepId
  | "success";

type ApplicationStepId =
  | "specialization"
  | "education-school"
  | "methods-choice"
  | "practice-start"
  | "practice-format"
  | "practice-price"
  | "supervision-status"
  | "supervision-frequency"
  | "personal-therapy"
  | "profile-photo"
  | "profile-contact";

type FlowCategoryId =
  | "specialization"
  | "education"
  | "methods"
  | "practice"
  | "supervision"
  | "profile";

type EducationDraft = {
  completionYear: string;
  documents: SpecialistAttachedDocument[];
  id: string;
  institution: string;
  program: string;
  qualification: string;
  startYear: string;
};

type TrainingDraft = {
  academicHours: string;
  approach: string;
  documents: SpecialistAttachedDocument[];
  endYear: string;
  id: string;
  institution: string;
  startYear: string;
};

type ContactKey = "email" | "social" | "telegram" | "website" | "whatsapp";
type PreferredContactKey = "email" | "telegram" | "whatsapp";

type ContactDraft = {
  isPublic: boolean;
  value: string;
};

type PhotoCropRect = {
  size: number;
  x: number;
  y: number;
};

export type SpecialistApplicationDraft = {
  aboutSpecialist: string;
  agreements: {
    communityRules: boolean;
    documentsPublic: boolean;
    truthfulData: boolean;
  };
  applicationStatus: SpecialistApplicationStatus;
  audiences: string[];
  city: string;
  clientAvailability: "" | "yes" | "no" | "waitlist";
  consultSinceYear: string;
  contactVerified: boolean;
  contacts: Record<ContactKey, ContactDraft>;
  duration: string;
  email: string;
  excludedRequests: string;
  firstMeeting: string;
  firstName: string;
  languages: string;
  lastName: string;
  mainEducation: EducationDraft[];
  methods: string[];
  moderatorComment: string | null;
  patronymic: string;
  personalTherapyStatus: "" | "yes" | "no" | "prefer_not";
  photoCropRect: PhotoCropRect | null;
  photoUrl: string | null;
  price: string;
  profileExcludedRequests: string;
  selectedPublicContact: ContactKey;
  shortDescription: string;
  specialistBirthDate: string;
  specialistGender: SpecialistGender | "";
  specialistPhoneCountry: SpecialistPhoneCountryCode;
  specialistPhoneNumber: string;
  specializations: string[];
  supervisionDocuments: SpecialistAttachedDocument[];
  supervisionFormat: "" | "group" | "individual" | "intervision";
  supervisionFrequency: "" | "as_needed" | "monthly" | "weekly" | "two_weeks";
  supervisionStatus: "" | "regular" | "periodic" | "none" | "prefer_not";
  timezone: string;
  trainings: TrainingDraft[];
  workFormat: "" | "hybrid" | "offline" | "online";
  workTopics: string[];
};

const STORAGE_KEY = "vnutri:specialist-application-draft:v1";
const RESEND_COOLDOWN_SECONDS = 60;
const PHOTO_ACCEPT = ".jpg,.jpeg,.png";
const PHOTO_AVATAR_OUTPUT_SIZE = 512;
const DEFAULT_PHOTO_CROP_RECT: PhotoCropRect = {
  size: 70,
  x: 15,
  y: 15,
};
const REQUIRED_STEP_ERROR = "Заполните этот шаг, чтобы продолжить.";

const FLOW_CATEGORIES: Array<{
  id: FlowCategoryId;
  label: string;
}> = [
  { id: "specialization", label: "Специализация" },
  { id: "education", label: "Высшее образование" },
  { id: "methods", label: "Методы" },
  { id: "practice", label: "Практика" },
  { id: "supervision", label: "Супервизия" },
  { id: "profile", label: "Профиль" },
];

const APPLICATION_STEPS: Array<{
  category: FlowCategoryId;
  id: ApplicationStepId;
}> = [
  { id: "specialization", category: "specialization" },
  { id: "education-school", category: "education" },
  { id: "methods-choice", category: "methods" },
  { id: "practice-start", category: "practice" },
  { id: "practice-format", category: "practice" },
  { id: "practice-price", category: "practice" },
  { id: "supervision-status", category: "supervision" },
  { id: "supervision-frequency", category: "supervision" },
  { id: "personal-therapy", category: "supervision" },
  { id: "profile-photo", category: "profile" },
  { id: "profile-contact", category: "profile" },
];

const LEGACY_SCREEN_MAP: Partial<Record<string, FlowScreen>> = {
  "education-document": "education-school",
  "education-years": "education-school",
  "methods-details": "methods-choice",
  qualification: "education-school",
  practice: "practice-start",
  profile: "profile-photo",
  review: "profile-contact",
};

const SPECIALIZATION_OPTIONS = [
  "Психология для взрослых",
  "Детская психология",
  "Семейная психология и пары",
  "Нейропсихология",
];

const METHOD_OPTIONS = THERAPEUTIC_APPROACH_OPTIONS.slice(0, 8);
const METHOD_SELECT_OPTIONS = METHOD_OPTIONS.map((method) => ({
  label: method,
  value: method,
}));

const WORK_FORMAT_OPTIONS = [
  { label: "Онлайн", value: "online" },
  { label: "Очно", value: "offline" },
  { label: "Онлайн и очно", value: "hybrid" },
] as const;

const SUPERVISION_STATUS_OPTIONS = [
  { label: "Да, регулярно", value: "regular" },
  { label: "Да, периодически", value: "periodic" },
  { label: "Сейчас нет", value: "none" },
  { label: "Предпочитаю не указывать", value: "prefer_not" },
] as const;

const SUPERVISION_FREQUENCY_OPTIONS = [
  { label: "Раз в неделю", value: "weekly" },
  { label: "Раз в две недели", value: "two_weeks" },
  { label: "Раз в месяц", value: "monthly" },
  { label: "По необходимости", value: "as_needed" },
] as const;

const PERSONAL_THERAPY_OPTIONS = [
  { label: "Да", value: "yes" },
  { label: "Нет", value: "no" },
  { label: "Предпочитаю не указывать", value: "prefer_not" },
] as const;

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEducationDraft(): EducationDraft {
  return {
    completionYear: "",
    documents: [],
    id: createId("education"),
    institution: "",
    program: "",
    qualification: "",
    startYear: "",
  };
}

function createTrainingDraft(): TrainingDraft {
  return {
    academicHours: "",
    approach: "",
    documents: [],
    endYear: "",
    id: createId("training"),
    institution: "",
    startYear: "",
  };
}

function createContactDraft(): ContactDraft {
  return {
    isPublic: false,
    value: "",
  };
}

export function createInitialDraft(): SpecialistApplicationDraft {
  return {
    aboutSpecialist: "",
    agreements: {
      communityRules: false,
      documentsPublic: false,
      truthfulData: false,
    },
    applicationStatus: "draft",
    audiences: ["взрослые"],
    city: "",
    clientAvailability: "",
    consultSinceYear: "",
    contactVerified: false,
    contacts: {
      email: createContactDraft(),
      social: createContactDraft(),
      telegram: createContactDraft(),
      website: createContactDraft(),
      whatsapp: createContactDraft(),
    },
    duration: "",
    email: "",
    excludedRequests: "",
    firstMeeting: "",
    firstName: "",
    languages: "Русский",
    lastName: "",
    mainEducation: [createEducationDraft()],
    methods: [],
    moderatorComment: null,
    patronymic: "",
    personalTherapyStatus: "",
    photoCropRect: null,
    photoUrl: null,
    price: "",
    profileExcludedRequests: "",
    selectedPublicContact: "email",
    shortDescription: "",
    specialistBirthDate: "",
    specialistGender: "",
    specialistPhoneCountry: DEFAULT_SPECIALIST_PHONE_COUNTRY,
    specialistPhoneNumber: "",
    specializations: [],
    supervisionDocuments: [],
    supervisionFormat: "",
    supervisionFrequency: "",
    supervisionStatus: "",
    timezone: "Europe/Moscow",
    trainings: [createTrainingDraft()],
    workFormat: "",
    workTopics: [],
  };
}

export function persistSpecialistApplicationDraft(
  draft: SpecialistApplicationDraft,
  screen: FlowScreen,
) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, screen }));
  } catch {
    // Large attached files may exceed localStorage. The in-memory draft still remains.
  }
}

export function readSpecialistApplicationState() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as {
      draft?: Partial<SpecialistApplicationDraft>;
      screen?: unknown;
    };
    const initialDraft = createInitialDraft();
    const storedMethods = parsed.draft?.methods ?? initialDraft.methods;
    const storedTrainings = (parsed.draft?.trainings?.length
      ? parsed.draft.trainings
      : initialDraft.trainings
    ).map((training, index) => {
      const normalizedTraining = normalizeTrainingDraft(training);

      return {
        ...normalizedTraining,
        approach: normalizedTraining.approach || storedMethods[index] || "",
      };
    });
    const draft = parsed.draft
      ? {
          ...initialDraft,
          ...parsed.draft,
          agreements: {
            ...initialDraft.agreements,
            ...parsed.draft.agreements,
          },
          contacts: {
            ...initialDraft.contacts,
            ...parsed.draft.contacts,
          },
          mainEducation: (parsed.draft.mainEducation?.length
            ? parsed.draft.mainEducation
            : initialDraft.mainEducation
          ).map((education) => normalizeEducationDraft(education)),
          methods: storedTrainings
            .map((training) => training.approach)
            .filter(Boolean),
          photoCropRect: normalizePhotoCropRect(parsed.draft.photoCropRect),
          selectedPublicContact:
            parsed.draft.selectedPublicContact ?? initialDraft.selectedPublicContact,
          specializations: parsed.draft.specializations ?? initialDraft.specializations,
          trainings: storedTrainings,
        }
      : initialDraft;

    return {
      draft,
      screen: normalizeStoredScreen(parsed.screen),
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function normalizePhotoCropRect(value: Partial<PhotoCropRect> | null | undefined) {
  const size = value?.size;
  const x = value?.x;
  const y = value?.y;

  if (
    !Number.isFinite(size)
    || !Number.isFinite(x)
    || !Number.isFinite(y)
  ) {
    return null;
  }

  return {
    size: size as number,
    x: x as number,
    y: y as number,
  };
}

function normalizeEducationDraft(value: Partial<EducationDraft> | undefined): EducationDraft {
  return {
    completionYear: value?.completionYear ?? "",
    documents: value?.documents ?? [],
    id: value?.id ?? createId("education"),
    institution: value?.institution ?? "",
    program: value?.program ?? "",
    qualification: value?.qualification ?? "",
    startYear: value?.startYear ?? "",
  };
}

function normalizeTrainingDraft(value: Partial<TrainingDraft> | undefined): TrainingDraft {
  return {
    academicHours: value?.academicHours ?? "",
    approach: value?.approach ?? "",
    documents: value?.documents ?? [],
    endYear: value?.endYear ?? "",
    id: value?.id ?? createId("training"),
    institution: value?.institution ?? "",
    startYear: value?.startYear ?? "",
  };
}

function normalizeStoredScreen(value: unknown): FlowScreen | null {
  if (typeof value !== "string") {
    return null;
  }

  if (LEGACY_SCREEN_MAP[value]) {
    return LEGACY_SCREEN_MAP[value] ?? null;
  }

  if (
    value === "general"
    || value === "contact"
    || value === "success"
    || APPLICATION_STEPS.some((step) => step.id === value)
  ) {
    return value as FlowScreen;
  }

  return null;
}

function getApplicationStepIndex(screen: FlowScreen) {
  return APPLICATION_STEPS.findIndex((step) => step.id === screen);
}

function getCategoryStepRange(categoryId: FlowCategoryId) {
  const indices = APPLICATION_STEPS
    .map((step, index) => step.category === categoryId ? index : -1)
    .filter((index) => index >= 0);

  return {
    first: indices[0] ?? 0,
    last: indices[indices.length - 1] ?? 0,
  };
}

function getCategoryLabel(categoryId: FlowCategoryId) {
  return FLOW_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "";
}

function getCurrentCategory(screen: FlowScreen) {
  const currentStep = APPLICATION_STEPS.find((step) => step.id === screen);
  return currentStep?.category ?? "specialization";
}

function isSupervisionPositive(status: SpecialistApplicationDraft["supervisionStatus"]) {
  return status === "regular" || status === "periodic";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Не удалось прочитать файл."));
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function createPdfDocumentPreviewUrl(fileName: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const previewSize = 640;

  if (!context) {
    return undefined;
  }

  canvas.width = previewSize;
  canvas.height = previewSize;

  context.fillStyle = "#F5F7FA";
  context.fillRect(0, 0, previewSize, previewSize);

  const pageX = 132;
  const pageY = 72;
  const pageWidth = 376;
  const pageHeight = 496;
  const radius = 26;

  context.fillStyle = "#FFFFFF";
  context.beginPath();
  context.roundRect(pageX, pageY, pageWidth, pageHeight, radius);
  context.fill();

  context.strokeStyle = "#E1E5EB";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#F04438";
  context.beginPath();
  context.roundRect(pageX + 40, pageY + 42, 118, 56, 16);
  context.fill();

  context.fillStyle = "#FFFFFF";
  context.font = "700 34px Helvetica Neue, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("PDF", pageX + 99, pageY + 70);

  context.strokeStyle = "#D7DDE5";
  context.lineWidth = 8;
  context.lineCap = "round";

  for (let index = 0; index < 7; index += 1) {
    const y = pageY + 150 + index * 42;
    const lineWidth = index % 3 === 2 ? 196 : 288;

    context.beginPath();
    context.moveTo(pageX + 44, y);
    context.lineTo(pageX + 44 + lineWidth, y);
    context.stroke();
  }

  context.fillStyle = "#6B7280";
  context.font = "500 26px Helvetica Neue, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";

  const nameLines = wrapCanvasText(context, fileName, pageWidth - 80).slice(0, 2);
  nameLines.forEach((line, index) => {
    context.fillText(line, pageX + pageWidth / 2, pageY + pageHeight - 96 + index * 32);
  });

  return canvas.toDataURL("image/png");
}

async function createDocumentPreviewUrl(file: File, url: string) {
  if (file.type === "application/pdf") {
    return createPdfDocumentPreviewUrl(file.name);
  }

  if (!file.type.startsWith("image/")) {
    return undefined;
  }

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Не удалось подготовить превью."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    const previewSize = 640;
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, Math.round((image.naturalWidth - cropSize) / 2));
    const sourceY = 0;
    const context = canvas.getContext("2d");

    if (!context || !cropSize) {
      return undefined;
    }

    canvas.width = previewSize;
    canvas.height = previewSize;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      previewSize,
      previewSize,
    );

    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

async function readDocumentFiles(files: File[] | FileList | null) {
  const selectedFiles = Array.isArray(files) ? files : Array.from(files ?? []);
  const documents: SpecialistAttachedDocument[] = [];

  for (const file of selectedFiles) {
    const url = await readFileAsDataUrl(file);
    const previewUrl = await createDocumentPreviewUrl(file, url);

    documents.push({
      id: createId("document"),
      mimeType: file.type || "application/octet-stream",
      name: file.name,
      previewUrl,
      size: file.size,
      status: "pending_review",
      url,
    });
  }

  return documents;
}

function normalizeTelegramUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://t.me/${trimmed.replace(/^@/, "")}`;
}

function normalizeWhatsappUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  return digits ? `https://wa.me/${digits}` : null;
}

function buildProfileDescription(draft: SpecialistApplicationDraft) {
  return [
    draft.shortDescription,
    draft.aboutSpecialist,
    draft.firstMeeting ? `Как проходит первая встреча\n${draft.firstMeeting}` : "",
    draft.profileExcludedRequests
      ? `С чем не работаю\n${draft.profileExcludedRequests}`
      : "",
  ].filter((item) => item.trim()).join("\n\n");
}

function buildEducationPayload(draft: SpecialistApplicationDraft): SpecialistEducationItem[] {
  const educationItems: SpecialistEducationItem[] = draft.mainEducation
    .filter((education) => (
      education.institution.trim()
      || education.program.trim()
      || education.startYear.trim()
      || education.completionYear.trim()
      || education.documents.length > 0
    ))
    .map((education) => ({
      documents: education.documents,
      id: education.id,
      institution: education.institution.trim(),
      kind: "education",
      program: education.program.trim(),
      qualification: education.qualification.trim() || education.program.trim(),
      year: [education.startYear.trim(), education.completionYear.trim()]
        .filter(Boolean)
        .join("–"),
    }));

  const trainingItems = draft.trainings
    .filter((training) => (
      training.institution.trim()
      || training.approach.trim()
      || training.startYear.trim()
      || training.endYear.trim()
      || training.academicHours.trim()
      || training.documents.length > 0
    ))
    .map<SpecialistEducationItem>((training) => ({
      academicHours: training.academicHours.trim(),
      approach: training.approach.trim(),
      documents: training.documents,
      id: training.id,
      institution: training.institution.trim(),
      kind: "training",
      year: [training.startYear.trim(), training.endYear.trim()]
        .filter(Boolean)
        .join("–"),
    }));

  const supervision = draft.supervisionDocuments.length > 0
    ? [{
        documents: draft.supervisionDocuments,
        id: createId("supervision"),
        institution: "Супервизия",
        kind: "supervision" as const,
        program: SUPERVISION_FREQUENCY_OPTIONS
          .find((item) => item.value === draft.supervisionFrequency)?.label ?? "",
        year: SUPERVISION_STATUS_OPTIONS
          .find((item) => item.value === draft.supervisionStatus)?.label ?? "",
      }]
    : [];

  return [...educationItems, ...trainingItems, ...supervision];
}

function isEducationDraftComplete(education: EducationDraft | undefined) {
  if (!education) {
    return false;
  }

  return Boolean(
    education.institution.trim()
    && education.program.trim()
    && education.startYear.trim()
    && education.completionYear.trim()
    && education.documents.length > 0,
  );
}

function isTrainingDraftComplete(training: TrainingDraft | undefined) {
  if (!training) {
    return false;
  }

  return Boolean(
    training.institution.trim()
    && training.approach.trim()
    && training.startYear.trim()
    && training.endYear.trim()
    && training.academicHours.trim()
    && training.documents.length > 0,
  );
}

function getPreferredContactKey(value: ContactKey): PreferredContactKey {
  return value === "telegram" || value === "whatsapp" ? value : "email";
}

function getContactValue(draft: SpecialistApplicationDraft, key: ContactKey) {
  if (key === "email") {
    return (draft.contacts.email.isPublic
      ? draft.contacts.email.value
      : draft.contacts.email.value || draft.email
    ).trim();
  }

  if (key === "whatsapp") {
    return draft.contacts.whatsapp.value.trim();
  }

  return draft.contacts[key].value.trim();
}

function isStepComplete(screen: ApplicationStepId, draft: SpecialistApplicationDraft) {
  switch (screen) {
    case "specialization":
      return draft.specializations.length > 0;
    case "education-school":
      return draft.mainEducation.length > 0
        && draft.mainEducation.every((education) => isEducationDraftComplete(education));
    case "methods-choice":
      return draft.trainings.length > 0
        && draft.trainings.every((training) => isTrainingDraftComplete(training));
    case "practice-start":
      return Boolean(draft.consultSinceYear.trim());
    case "practice-format":
      return Boolean(
        draft.workFormat
        && (draft.workFormat === "online" || draft.city.trim()),
      );
    case "practice-price":
      return Boolean(draft.price.trim() && draft.duration.trim());
    case "supervision-status":
      return Boolean(draft.supervisionStatus);
    case "supervision-frequency":
      return !isSupervisionPositive(draft.supervisionStatus)
        || Boolean(draft.supervisionFrequency);
    case "personal-therapy":
      return Boolean(draft.personalTherapyStatus);
    case "profile-photo":
      return Boolean(draft.photoUrl);
    case "profile-contact":
      return Boolean(getContactValue(draft, getPreferredContactKey(draft.selectedPublicContact)));
  }
}

function getReachableStepIndex(draft: SpecialistApplicationDraft) {
  let reachableIndex = 0;

  for (let index = 0; index < APPLICATION_STEPS.length - 1; index += 1) {
    if (!isStepComplete(APPLICATION_STEPS[index].id, draft)) {
      break;
    }

    reachableIndex = index + 1;
  }

  return reachableIndex;
}

function FlowTextInput({
  label,
  suffix,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  suffix?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className={fieldControlLabelClassName}>
        {label}
      </span>
      <span className="relative block">
        <Input
          {...props}
          className={cn(
            fieldControlInputClassName,
            "w-full",
            suffix ? "pr-16" : "",
            props.className,
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] leading-5 text-[var(--label-tertiary)]">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function FlowBareInput({
  suffix,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  suffix?: string;
}) {
  return (
    <span className="relative block">
      <Input
        {...props}
        className={cn(
          fieldControlInputClassName,
          "w-full",
          suffix ? "pr-16" : "",
          props.className,
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[16px] leading-5 text-[var(--label-tertiary)]">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

function FieldError({ children }: { children?: string }) {
  return children ? (
    <ErrorMessage className="text-[14px] leading-5 text-[var(--danger)]">
      {children}
    </ErrorMessage>
  ) : null;
}

function RadioCards<TValue extends string>({
  name,
  onChange,
  options,
  value,
}: {
  name: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  value: TValue | "";
}) {
  return (
    <fieldset className="grid gap-2">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <label
            key={option.value}
            className={cn(
              "group flex cursor-pointer items-center gap-4 py-2 pl-0.5 text-[16px] leading-6 transition-colors",
              isSelected
                ? "text-[var(--accent-primary)]"
                : "text-[var(--label-primary)]",
            )}
          >
            <input
              checked={isSelected}
              className="peer sr-only"
              name={name}
              type="radio"
              value={option.value}
              onChange={() => onChange(option.value)}
            />
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 flex-none place-items-center rounded-full border-2 transition-[background-color,border-color,box-shadow] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--field-focus-border)]",
                isSelected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                  : "border-[var(--color-field-border)] bg-transparent group-hover:border-[var(--accent-primary)] group-hover:shadow-[0_0_0_var(--field-focus-ring-width)_var(--color-accent-soft)]",
              )}
            >
              {isSelected ? <span className="size-2 rounded-full bg-white" /> : null}
            </span>
            <span className="min-w-0 flex-1">{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function CheckCards({
  onChange,
  options,
  value,
}: {
  onChange: (value: string[]) => void;
  options: string[];
  value: string[];
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const isSelected = value.includes(option);

        return (
          <label
            key={option}
            className={cn(
              "group flex cursor-pointer items-center gap-4 py-2 pl-0.5 text-[16px] leading-6 transition-colors",
              isSelected
                ? "text-[var(--accent-primary)]"
                : "text-[var(--label-primary)]",
            )}
          >
            <input
              checked={isSelected}
              className="peer sr-only"
              type="checkbox"
              value={option}
              onChange={() => {
                onChange(
                  isSelected
                    ? value.filter((item) => item !== option)
                    : [...value, option],
                );
              }}
            />
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 flex-none place-items-center rounded-[6px] border-2 transition-[background-color,border-color,box-shadow] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--field-focus-border)]",
                isSelected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                  : "border-[var(--color-field-border)] bg-transparent group-hover:border-[var(--accent-primary)] group-hover:shadow-[0_0_0_var(--field-focus-ring-width)_var(--color-accent-soft)]",
              )}
            >
              {isSelected ? <CheckIndicatorIcon /> : null}
            </span>
            <span className="min-w-0 flex-1">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M5.75 2.25h5.42c.4 0 .78.16 1.06.44l2.58 2.58c.28.28.44.66.44 1.06v7.92A3.5 3.5 0 0 1 11.75 17.75h-6A3.5 3.5 0 0 1 2.25 14.25v-8.5A3.5 3.5 0 0 1 5.75 2.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M11.25 2.5v3.25c0 .55.45 1 1 1h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M6 10.25h6M6 13.25h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FlowPlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="size-5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2L10 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M2 10H18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10 1.25C10.4142 1.25 10.75 1.58579 10.75 2V9.25H18C18.4142 9.25 18.75 9.58579 18.75 10C18.75 10.4142 18.4142 10.75 18 10.75H10.75V18C10.75 18.4142 10.4142 18.75 10 18.75C9.58579 18.75 9.25 18.4142 9.25 18V10.75H2C1.58579 10.75 1.25 10.4142 1.25 10C1.25 9.58579 1.58579 9.25 2 9.25H9.25V2C9.25 1.58579 9.58579 1.25 10 1.25Z"
        fill="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FlowPlusCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="size-5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 0.916016C15.0163 0.916279 19.0838 4.98373 19.084 10C19.0837 15.0162 15.0162 19.0837 10 19.084C4.98373 19.0838 0.916279 15.0163 0.916016 10C0.916191 4.98367 4.98367 0.916191 10 0.916016ZM10 2.41699C5.8121 2.41717 2.41717 5.8121 2.41699 10C2.41726 14.1878 5.81215 17.5838 10 17.584C14.1878 17.5837 17.5837 14.1878 17.584 10C17.5838 5.81215 14.1878 2.41726 10 2.41699ZM10 5.91699C10.4142 5.91699 10.75 6.25278 10.75 6.66699V9.25H13.334C13.7478 9.25044 14.084 9.58606 14.084 10C14.084 10.4139 13.7478 10.7496 13.334 10.75H10.75V13.334C10.7496 13.7478 10.4139 14.084 10 14.084C9.58606 14.084 9.25044 13.7478 9.25 13.334V10.75H6.66699C6.25278 10.75 5.91699 10.4142 5.91699 10C5.91699 9.58579 6.25278 9.25 6.66699 9.25H9.25V6.66699C9.25 6.25278 9.58579 5.91699 10 5.91699Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PdfPreviewImage({
  name,
}: {
  name: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPreviewUrl(createPdfDocumentPreviewUrl(name) ?? null);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [name]);

  if (!previewUrl) {
    return (
      <span className="grid size-full place-items-center text-[var(--accent-primary)] [&_svg]:size-8">
        <DocumentIcon />
      </span>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={name}
      className="block size-full object-cover object-top"
    />
  );
}

function CompactUploadField({
  accept,
  documents,
  emptyTitle = "Добавить файл",
  helperText = "PDF, JPG или PNG",
  id,
  multiple = true,
  onChange,
}: {
  accept?: Record<string, string[]>;
  documents: SpecialistAttachedDocument[];
  emptyTitle?: string;
  helperText?: string;
  id: string;
  multiple?: boolean;
  onChange: (documents: SpecialistAttachedDocument[]) => void;
}) {
  const [uploadError, setUploadError] = useState("");
  const maxDocuments = multiple ? 5 : 1;
  const remainingDocumentSlots = Math.max(maxDocuments - documents.length, 0);
  const canUploadMore = remainingDocumentSlots > 0;

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: accept ?? {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    disabled: !canUploadMore,
    maxFiles: Math.max(1, remainingDocumentSlots),
    multiple,
    noClick: true,
    onDropAccepted: async (acceptedFiles) => {
      setUploadError("");

      try {
        const nextDocuments = await readDocumentFiles(
          acceptedFiles.slice(0, remainingDocumentSlots),
        );

        onChange(
          multiple
            ? [...documents, ...nextDocuments].slice(0, maxDocuments)
            : nextDocuments.slice(0, 1),
        );
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Не удалось загрузить файл.");
      }
    },
    onDropRejected: (fileRejections) => {
      setUploadError(
        documents.length >= maxDocuments || fileRejections.length > remainingDocumentSlots
          ? `Можно загрузить до ${maxDocuments} файлов.`
          : "Загрузите файл подходящего формата.",
      );
    },
  });

  return (
    <div className="grid gap-2">
      <div
        {...getRootProps()}
        className="flex flex-wrap items-start gap-3"
      >
        <input {...getInputProps({ id })} />

        {documents.map((document) => {
          const isImage = document.mimeType.startsWith("image/");
          const isPdf = document.mimeType === "application/pdf";
          const previewUrl = document.previewUrl ?? (isImage ? document.url : null);

          return (
            <div
              key={document.id}
              className="group relative size-[112px] overflow-hidden rounded-[18px] border border-[var(--color-field-border)] bg-[var(--field-background)]"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={document.name}
                  className="block size-full object-cover object-top"
                />
              ) : isPdf ? (
                <PdfPreviewImage name={document.name} />
              ) : (
                <span className="grid size-full place-items-center text-[var(--accent-primary)] [&_svg]:size-8">
                  <DocumentIcon />
                </span>
              )}
              <button
                type="button"
                className="absolute right-2 top-2 z-[1] grid size-7 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-[background-color,opacity] hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 [&_svg]:!size-4"
                aria-label={`Удалить ${document.name}`}
                onClick={() => onChange(documents.filter((item) => item.id !== document.id))}
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}

        {canUploadMore ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={isDragActive ? "Отпустите файл" : emptyTitle}
            className={cn(
              "grid size-[112px] cursor-pointer place-items-center rounded-[18px] border border-dashed text-[var(--accent-primary)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--field-focus-border)]",
              isDragActive
                ? "border-[var(--field-focus-border)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-field-border)] bg-[var(--field-background)] hover:border-[var(--color-field-border-hover)] hover:bg-[var(--color-field-hover)]",
            )}
            onClick={(event) => {
              event.stopPropagation();
              open();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                open();
              }
            }}
          >
            <FlowPlusIcon />
            <span className="sr-only">
              {helperText}
            </span>
          </div>
        ) : null}
      </div>

      <FieldError>{uploadError}</FieldError>
    </div>
  );
}

function getPhotoImageBounds(aspectRatio: number) {
  return aspectRatio >= 1
    ? {
        height: 100 / aspectRatio,
        width: 100,
        x: 0,
        y: (100 - (100 / aspectRatio)) / 2,
      }
    : {
        height: 100,
        width: aspectRatio * 100,
        x: (100 - (aspectRatio * 100)) / 2,
        y: 0,
      };
}

function getInitialPhotoCropRect(aspectRatio: number) {
  const imageBounds = getPhotoImageBounds(aspectRatio);
  const size = Math.min(imageBounds.width, imageBounds.height) * 0.78;

  return {
    size,
    x: imageBounds.x + (imageBounds.width - size) / 2,
    y: imageBounds.y + (imageBounds.height - size) / 2,
  };
}

function clampPhotoCropRect(nextRect: PhotoCropRect, imageBounds: ReturnType<typeof getPhotoImageBounds>) {
  const minSize = Math.min(24, imageBounds.width, imageBounds.height);
  const maxSize = Math.min(imageBounds.width, imageBounds.height);
  const size = Math.max(minSize, Math.min(maxSize, nextRect.size));
  const x = Math.max(
    imageBounds.x,
    Math.min(imageBounds.x + imageBounds.width - size, nextRect.x),
  );
  const y = Math.max(
    imageBounds.y,
    Math.min(imageBounds.y + imageBounds.height - size, nextRect.y),
  );

  return { size, x, y };
}

function loadPhotoImage(sourceImage: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось обработать фото."));
    image.src = sourceImage;
  });
}

async function buildCroppedPhotoDataUrl(sourceImage: string | null, cropRect: PhotoCropRect | null) {
  if (!sourceImage) {
    return null;
  }

  const image = await loadPhotoImage(sourceImage);
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const imageBounds = getPhotoImageBounds(aspectRatio);
  const resolvedCropRect = clampPhotoCropRect(
    cropRect ?? getInitialPhotoCropRect(aspectRatio),
    imageBounds,
  );
  const sourceX = Math.max(
    0,
    Math.round(((resolvedCropRect.x - imageBounds.x) / imageBounds.width) * image.naturalWidth),
  );
  const sourceY = Math.max(
    0,
    Math.round(((resolvedCropRect.y - imageBounds.y) / imageBounds.height) * image.naturalHeight),
  );
  const sourceWidth = Math.min(
    image.naturalWidth - sourceX,
    Math.round((resolvedCropRect.size / imageBounds.width) * image.naturalWidth),
  );
  const sourceHeight = Math.min(
    image.naturalHeight - sourceY,
    Math.round((resolvedCropRect.size / imageBounds.height) * image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = PHOTO_AVATAR_OUTPUT_SIZE;
  canvas.height = PHOTO_AVATAR_OUTPUT_SIZE;

  if (!context) {
    throw new Error("Не удалось подготовить фото.");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    PHOTO_AVATAR_OUTPUT_SIZE,
    PHOTO_AVATAR_OUTPUT_SIZE,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}

function PhotoUploadField({
  cropRect,
  onChange,
  onCropChange,
  value,
}: {
  cropRect: PhotoCropRect | null;
  onChange: (value: string | null) => void;
  onCropChange: (value: PhotoCropRect | null) => void;
  value: string | null;
}) {
  const [uploadError, setUploadError] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const resolvedCropRect = cropRect ?? DEFAULT_PHOTO_CROP_RECT;
  const dragStartRef = useRef<{
    action: "move" | "resize";
    handle?: CropHandle;
    pointerX: number;
    pointerY: number;
    rect: PhotoCropRect;
  } | null>(null);
  type CropHandle = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";
  const imageBounds = getPhotoImageBounds(imageAspectRatio);
  const imageStyle = {
    height: `${imageBounds.height}%`,
    left: `${imageBounds.x}%`,
    top: `${imageBounds.y}%`,
    width: `${imageBounds.width}%`,
  };
  const previewImageStyle = {
    height: `${(imageBounds.height / resolvedCropRect.size) * 100}%`,
    left: `${((imageBounds.x - resolvedCropRect.x) / resolvedCropRect.size) * 100}%`,
    top: `${((imageBounds.y - resolvedCropRect.y) / resolvedCropRect.size) * 100}%`,
    width: `${(imageBounds.width / resolvedCropRect.size) * 100}%`,
  };

  function updateCropRect(nextRect: PhotoCropRect) {
    onCropChange(clampPhotoCropRect(nextRect, imageBounds));
  }

  function handleCropPointerDown(event: PointerEvent<HTMLElement>, handle?: CropHandle) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      action: handle ? "resize" : "move",
      handle,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rect: resolvedCropRect,
    };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;

    if (!dragStart) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - dragStart.pointerX) / rect.width) * 100;
    const deltaY = ((event.clientY - dragStart.pointerY) / rect.height) * 100;

    if (dragStart.action === "move") {
      updateCropRect({
        ...dragStart.rect,
        x: dragStart.rect.x + deltaX,
        y: dragStart.rect.y + deltaY,
      });
      return;
    }

    const handle = dragStart.handle ?? "se";
    const sizeCandidates: number[] = [];

    if (handle.includes("e")) sizeCandidates.push(dragStart.rect.size + deltaX);
    if (handle.includes("s")) sizeCandidates.push(dragStart.rect.size + deltaY);
    if (handle.includes("w")) sizeCandidates.push(dragStart.rect.size - deltaX);
    if (handle.includes("n")) sizeCandidates.push(dragStart.rect.size - deltaY);

    const nextSize = sizeCandidates.reduce((selectedSize, candidateSize) => (
      Math.abs(candidateSize - dragStart.rect.size) > Math.abs(selectedSize - dragStart.rect.size)
        ? candidateSize
        : selectedSize
    ), dragStart.rect.size);
    let nextX = dragStart.rect.x;
    let nextY = dragStart.rect.y;

    if (handle.includes("w")) {
      nextX = dragStart.rect.x + dragStart.rect.size - nextSize;
    } else if (!handle.includes("e")) {
      nextX = dragStart.rect.x + (dragStart.rect.size - nextSize) / 2;
    }

    if (handle.includes("n")) {
      nextY = dragStart.rect.y + dragStart.rect.size - nextSize;
    } else if (!handle.includes("s")) {
      nextY = dragStart.rect.y + (dragStart.rect.size - nextSize) / 2;
    }

    updateCropRect({
      size: nextSize,
      x: nextX,
      y: nextY,
    });
  }

  function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;
    const target = event.target instanceof HTMLElement ? event.target : null;

    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    } else if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      onCropChange(null);
      onChange(await readFileAsDataUrl(file));
      event.target.value = "";
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Не удалось загрузить фото.");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="specialist-profile-photo"
          type="file"
          accept={PHOTO_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
        />
        <label
          htmlFor="specialist-profile-photo"
          className={buttonClassName({
            className: "w-fit cursor-pointer",
            size: "sm",
            variant: "secondary",
          })}
        >
          Заменить фото
        </label>
        {value ? (
          <Button
            type="button"
            variant="quaternary-accent"
            size="sm"
            onPress={() => {
              onCropChange(null);
              onChange(null);
            }}
          >
            Удалить
          </Button>
        ) : null}
      </div>

      {value ? (
        <div className="grid gap-8 min-[640px]:grid-cols-[minmax(0,320px)_180px]">
          <div className="grid gap-3">
            <p className={fieldControlLabelClassName}>Редактирование</p>
            <div
              className="relative aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-[16px] bg-black"
              onPointerDown={(event) => handleCropPointerDown(event)}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              <img
                src={value}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                onLoad={(event) => {
                  const image = event.currentTarget;
                  const nextAspectRatio = image.naturalWidth / image.naturalHeight;

                  if (Number.isFinite(nextAspectRatio) && nextAspectRatio > 0) {
                    const nextImageBounds = getPhotoImageBounds(nextAspectRatio);

                    setImageAspectRatio(nextAspectRatio);
                    onCropChange(
                      cropRect
                        ? clampPhotoCropRect(cropRect, nextImageBounds)
                        : getInitialPhotoCropRect(nextAspectRatio),
                    );
                  }
                }}
                style={imageStyle}
              />
              <div
                className="pointer-events-none absolute bg-black/45"
                style={{
                  height: `${resolvedCropRect.y}%`,
                  left: 0,
                  top: 0,
                  width: "100%",
                }}
              />
              <div
                className="pointer-events-none absolute bg-black/45"
                style={{
                  height: `${100 - resolvedCropRect.y - resolvedCropRect.size}%`,
                  left: 0,
                  top: `${resolvedCropRect.y + resolvedCropRect.size}%`,
                  width: "100%",
                }}
              />
              <div
                className="pointer-events-none absolute bg-black/45"
                style={{
                  height: `${resolvedCropRect.size}%`,
                  left: 0,
                  top: `${resolvedCropRect.y}%`,
                  width: `${resolvedCropRect.x}%`,
                }}
              />
              <div
                className="pointer-events-none absolute bg-black/45"
                style={{
                  height: `${resolvedCropRect.size}%`,
                  left: `${resolvedCropRect.x + resolvedCropRect.size}%`,
                  top: `${resolvedCropRect.y}%`,
                  width: `${100 - resolvedCropRect.x - resolvedCropRect.size}%`,
                }}
              />
              <div
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.18)]"
                style={{
                  height: `${resolvedCropRect.size}%`,
                  left: `${resolvedCropRect.x}%`,
                  top: `${resolvedCropRect.y}%`,
                  width: `${resolvedCropRect.size}%`,
                }}
                onPointerDown={(event) => handleCropPointerDown(event)}
              >
                {([
                  ["nw", "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"],
                  ["n", "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize"],
                  ["ne", "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"],
                  ["e", "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
                  ["se", "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"],
                  ["s", "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize"],
                  ["sw", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"],
                  ["w", "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize"],
                ] as Array<[CropHandle, string]>).map(([handle, className]) => (
                  <span
                    key={handle}
                    aria-hidden="true"
                    className={`absolute size-3 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18)] ${className}`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handleCropPointerDown(event, handle);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid w-full content-start gap-3">
            <p className={`${fieldControlLabelClassName} text-center`}>Превью</p>
            <div className="relative size-[180px] overflow-hidden rounded-full bg-[var(--fill-primary)]">
              <img
                src={value}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={previewImageStyle}
              />
            </div>
          </div>
        </div>
      ) : null}

      <FieldError>{uploadError}</FieldError>
    </div>
  );
}

function ContactPreferenceTabs({
  draft,
  onEmailChange,
  onSelect,
  onTelegramChange,
  onWhatsappChange,
}: {
  draft: SpecialistApplicationDraft;
  onEmailChange: (value: string) => void;
  onSelect: (value: PreferredContactKey) => void;
  onTelegramChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
}) {
  const selectedKey = getPreferredContactKey(draft.selectedPublicContact);
  const emailValue = draft.contacts.email.isPublic
    ? draft.contacts.email.value
    : draft.contacts.email.value || draft.email;
  const whatsappValue = draft.contacts.whatsapp.value;

  return (
    <Tabs
      className="w-full gap-4"
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelect(String(key) as PreferredContactKey)}
    >
      <Tabs.ListContainer className="w-[360px] max-w-full">
        <Tabs.List aria-label="Предпочтительный способ связи">
          <Tabs.Tab key="email" id="email">
            Email
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="telegram" id="telegram">
            <Tabs.Separator />
            Telegram
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab key="whatsapp" id="whatsapp">
            <Tabs.Separator />
            WhatsApp
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel key="email" id="email" className="!px-0 !pb-0 pt-2">
        <FlowTextInput
          label="Email"
          type="email"
          value={emailValue}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </Tabs.Panel>
      <Tabs.Panel key="telegram" id="telegram" className="!px-0 !pb-0 pt-2">
        <FlowTextInput
          label="Telegram"
          placeholder="@username"
          value={draft.contacts.telegram.value}
          onChange={(event) => onTelegramChange(event.target.value)}
        />
      </Tabs.Panel>
      <Tabs.Panel key="whatsapp" id="whatsapp" className="!px-0 !pb-0 pt-2">
        <FlowTextInput
          label="WhatsApp"
          placeholder="+7 999 123-45-67"
          value={whatsappValue}
          onChange={(event) => onWhatsappChange(event.target.value)}
        />
      </Tabs.Panel>
    </Tabs>
  );
}

function FlowSidebar({
  activeIndex,
  furthestIndex,
  onSelectCategory,
}: {
  activeIndex: number;
  furthestIndex: number;
  onSelectCategory: (categoryId: FlowCategoryId) => void;
}) {
  return (
    <nav aria-label="Шаги проверки" className="surface-elevated rounded-[28px] p-3">
      <ol className="grid gap-0">
        {FLOW_CATEGORIES.map((category) => {
          const range = getCategoryStepRange(category.id);
          const isCurrent = activeIndex >= range.first && activeIndex <= range.last;
          const isCompleted = !isCurrent && furthestIndex > range.last;
          const isReachable = range.first <= furthestIndex;
          const canNavigate = isReachable && !isCurrent;

          return (
            <li key={category.id}>
              <button
                type="button"
                disabled={!canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-[14px] px-4 text-left text-[16px] font-medium leading-6 transition-colors",
                  isCurrent
                    ? "bg-[var(--color-accent-soft)] text-[var(--accent-primary)]"
                    : "",
                  isCompleted && !isCurrent
                    ? "text-[var(--label-primary)] hover:bg-[var(--fill-quaternary)]"
                    : "",
                  !isCurrent && !isCompleted
                    ? "text-[var(--label-tertiary)]"
                    : "",
                  canNavigate
                    ? "cursor-pointer"
                    : "cursor-default disabled:pointer-events-none disabled:cursor-default",
                )}
                onClick={() => {
                  if (canNavigate) {
                    onSelectCategory(category.id);
                  }
                }}
              >
                <span className="grid size-5 flex-none place-items-center text-[14px]">
                  {isCompleted ? (
                    <CheckIndicatorIcon />
                  ) : isCurrent ? (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isCurrent ? "bg-[var(--accent-primary)]" : "bg-[var(--label-tertiary)]",
                      )}
                    />
                  ) : (
                    <span aria-hidden="true" className="size-1.5" />
                  )}
                </span>
                <span>{category.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function MobileFlowNavigation({
  activeCategory,
  activeIndex,
  furthestIndex,
  isOpen,
  onClose,
  onOpenChange,
  onSelectCategory,
}: {
  activeCategory: FlowCategoryId;
  activeIndex: number;
  furthestIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCategory: (categoryId: FlowCategoryId) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--separator-primary)] bg-[var(--background-primary)] px-5 py-4 min-[900px]:hidden">
        <span className="w-10" />
        <button
          type="button"
          className="inline-flex min-w-0 items-center gap-1 text-[16px] font-semibold leading-6 text-[var(--label-primary)]"
          onClick={() => onOpenChange(true)}
        >
          <span className="truncate">{getCategoryLabel(activeCategory)}</span>
          <ChevronDownIcon />
        </button>
        <button
          type="button"
          aria-label="Закрыть проверку"
          className="interactive-quaternary grid size-10 place-items-center rounded-full text-[var(--label-primary)]"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>

      <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
        <Drawer.Backdrop variant="opaque">
          <Drawer.Content placement="bottom">
            <Drawer.Dialog className="rounded-t-[28px] p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <Drawer.Handle />
              <Drawer.Body className="m-0 p-0">
                <FlowSidebar
                  activeIndex={activeIndex}
                  furthestIndex={furthestIndex}
                  onSelectCategory={(categoryId) => {
                    onSelectCategory(categoryId);
                    onOpenChange(false);
                  }}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer.Root>
    </>
  );
}

function StepFrame({
  children,
  contentRef,
  description,
  error,
  isBackDisabled,
  isContinueDisabled,
  isSubmitting,
  nextIcon,
  nextLabel = "Продолжить",
  onBack,
  title,
}: {
  children: ReactNode;
  contentRef?: RefObject<HTMLDivElement | null>;
  description?: ReactNode;
  error?: string;
  isBackDisabled: boolean;
  isContinueDisabled: boolean;
  isSubmitting: boolean;
  nextIcon?: ReactNode;
  nextLabel?: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <section className="surface-elevated flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-[28px] max-[900px]:rounded-none">
      <div
        ref={contentRef}
        data-allow-native-wheel="true"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-8"
      >
        <div className="grid max-w-[640px] gap-7">
          <div className="grid gap-3">
            <h2 className="type-h2 font-semibold text-[var(--label-primary)]">
              {title}
            </h2>
            {description ? (
              <div className="max-w-[560px] text-[16px] leading-6 text-[var(--label-primary)]">
                {description}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6">
            {children}
            <FieldError>{error}</FieldError>
          </div>
        </div>
      </div>

      <div className="flex flex-none items-center justify-between gap-3 border-t border-[var(--separator-primary)] bg-[var(--background-elevated)] py-4 pl-4 pr-8 [border-top-color:color-mix(in_oklab,var(--separator-primary)_46%,transparent)]">
        <Button
          type="button"
          variant="quaternary-accent"
          size="md"
          className="min-w-[132px] !pl-0 !pr-2"
          disabled={isBackDisabled || isSubmitting}
          onPress={onBack}
        >
          <ArrowLeftIcon />
          Назад
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="min-w-[176px] !pl-2 !pr-0"
          disabled={isContinueDisabled || isSubmitting}
          isLoading={isSubmitting}
        >
          {nextLabel}
          {nextIcon ?? <ArrowRightIcon />}
        </Button>
      </div>
    </section>
  );
}

function ContactConfirmationStep({
  code,
  debugCode,
  email,
  error,
  isSubmitting,
  onBack,
  onCodeChange,
  onResend,
  resendCooldown,
}: {
  code: string;
  debugCode: string;
  email: string;
  error?: string;
  isSubmitting: boolean;
  onBack: () => void;
  onCodeChange: (code: string) => void;
  onResend: () => void;
  resendCooldown: number;
}) {
  return (
    <section className="surface-elevated mx-auto grid min-h-[560px] w-full max-w-[640px] content-start gap-6 rounded-[28px] p-5 min-[720px]:p-10">
      <div className="grid gap-3">
        <h1 className="text-[28px] font-semibold leading-[34px] text-[var(--label-primary)] min-[720px]:text-[32px] min-[720px]:leading-[38px]">
          Подтвердите электронную почту
        </h1>
        <p className="text-[16px] leading-7 text-[var(--label-secondary)]">
          Мы отправили код на {email}.
        </p>
      </div>

      <div className="grid gap-3">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
          isInvalid={Boolean(error)}
          isDisabled={isSubmitting}
          onChange={onCodeChange}
          autoFocus
        >
          <InputOTP.Group>
            <InputOTP.Slot index={0} />
            <InputOTP.Slot index={1} />
            <InputOTP.Slot index={2} />
          </InputOTP.Group>
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
        <FieldError>{error}</FieldError>
        {debugCode ? (
          <p className="rounded-[16px] bg-[var(--fill-secondary)] px-4 py-3 text-[14px] leading-5 text-[var(--label-secondary)]">
            Локальный код:{" "}
            <span className="font-semibold text-[var(--label-primary)]">{debugCode}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onPress={onBack}>
          <ArrowLeftIcon />
          Назад
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={resendCooldown > 0 || isSubmitting}
          onPress={onResend}
        >
          {resendCooldown > 0
            ? `Повторить через ${resendCooldown} с`
            : "Отправить код снова"}
        </Button>
      </div>
    </section>
  );
}

function GeneralFallback({
  onStart,
}: {
  onStart: () => void;
}) {
  return (
    <section className="mx-auto grid min-h-[420px] w-full max-w-[640px] content-center gap-4 rounded-[24px] bg-[var(--background-primary)] p-8 text-center">
      <h1 className="text-[28px] font-semibold leading-[34px] text-[var(--label-primary)]">
        Проверка специалиста
      </h1>
      <p className="text-[16px] leading-6 text-[var(--label-secondary)]">
        Заполните стартовые данные на странице «Специалистам», затем продолжите проверку.
      </p>
      <Button type="button" variant="primary" className="mx-auto" onPress={onStart}>
        Перейти к проверке
      </Button>
    </section>
  );
}

export function SpecialistApplicationFlow({
  mode = "entry",
}: {
  mode?: "application" | "entry";
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<SpecialistApplicationDraft>(createInitialDraft);
  const [screen, setScreen] = useState<FlowScreen>(
    mode === "application" ? "contact" : "general",
  );
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [formError, setFormError] = useState("");
  const [contactCode, setContactCode] = useState("");
  const [contactCodeError, setContactCodeError] = useState("");
  const [debugContactCode, setDebugContactCode] = useState("");
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const isSubmitting = false;
  const [isReady, setIsReady] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAutoSentContactCodeRef = useRef(false);
  const pendingScrollTargetRef = useRef<string | null>(null);
  const stepContentRef = useRef<HTMLDivElement | null>(null);

  const activeStepIndex = Math.max(0, getApplicationStepIndex(screen));
  const activeCategory = getCurrentCategory(screen);
  const activeStep = APPLICATION_STEPS[activeStepIndex]?.id ?? "specialization";
  const sidebarFurthestStepIndex = Math.min(
    furthestStepIndex,
    getReachableStepIndex(draft),
  );
  const canContinue = screen !== "contact"
    && screen !== "general"
    && screen !== "success"
    && isStepComplete(activeStep, draft);

  useEffect(() => {
    const storedApplicationState = readSpecialistApplicationState();

    if (storedApplicationState) {
      setDraft(storedApplicationState.draft);

      if (storedApplicationState.draft.applicationStatus === "pending_review") {
        setScreen("success");
        setFurthestStepIndex(APPLICATION_STEPS.length - 1);
      } else if (mode === "application") {
        const storedScreen = storedApplicationState.screen;
        const shouldUseStoredScreen = storedScreen
          && storedScreen !== "general";
        const nextScreen = storedApplicationState.draft.contactVerified
          ? (
              shouldUseStoredScreen && storedScreen !== "contact"
                ? storedScreen
                : "specialization"
            )
          : "contact";

        setScreen(nextScreen);
        setFurthestStepIndex(Math.max(0, getApplicationStepIndex(nextScreen)));
      }
    }

    if (mode === "application" && !storedApplicationState) {
      setScreen("specialization");
      setFurthestStepIndex(0);
    }

    setIsReady(true);
  }, [mode]);

  useEffect(() => {
    if (!isReady || screen === "success") {
      return;
    }

    persistSpecialistApplicationDraft(draft, screen);
  }, [draft, isReady, screen]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      stepContentRef.current?.scrollTo({
        left: 0,
        top: 0,
      });
    });
  }, [screen]);

  useEffect(() => (
    () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }
  ), []);

  useEffect(() => {
    if (screen === "contact" && contactCode.length === 6 && !isContactSubmitting) {
      void verifyContactCode(contactCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactCode, screen]);

  useEffect(() => {
    if (
      !isReady
      || mode !== "application"
      || screen !== "contact"
      || draft.contactVerified
      || hasAutoSentContactCodeRef.current
      || !EMAIL_PATTERN.test(draft.email.trim())
    ) {
      return;
    }

    hasAutoSentContactCodeRef.current = true;
    void sendContactCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.contactVerified, draft.email, isReady, mode, screen]);

  useEffect(() => {
    if (
      !isReady
      || mode !== "application"
      || screen !== "contact"
      || !draft.contactVerified
    ) {
      return;
    }

    commitScreen("specialization");
  }, [draft.contactVerified, isReady, mode, screen]);

  useEffect(() => {
    const targetId = pendingScrollTargetRef.current;

    if (!targetId) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollContainer = stepContentRef.current;
      const targetElement = scrollContainer?.querySelector<HTMLElement>(
        `[data-flow-item-id="${targetId}"]`,
      );

      if (!scrollContainer || !targetElement) {
        pendingScrollTargetRef.current = null;
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const targetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop;

      scrollContainer.scrollTo({
        behavior: "smooth",
        top: targetTop,
      });
      pendingScrollTargetRef.current = null;
    });
  }, [draft.mainEducation.length, draft.trainings.length]);

  function updateDraft<K extends keyof SpecialistApplicationDraft>(
    key: K,
    value: SpecialistApplicationDraft[K],
  ) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
    setStepError("");
    setFormError("");
  }

  function updatePhoto(value: string | null) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      photoCropRect: value ? currentDraft.photoCropRect : null,
      photoUrl: value,
    }));
    setStepError("");
    setFormError("");
  }

  function updatePhotoCropRect(value: PhotoCropRect | null) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      photoCropRect: value,
    }));
  }

  function commitScreen(nextScreen: FlowScreen) {
    setScreen(nextScreen);
    setStepError("");
    setFormError("");

    const nextIndex = getApplicationStepIndex(nextScreen);

    if (nextIndex >= 0) {
      setFurthestStepIndex((currentIndex) => Math.max(currentIndex, nextIndex));
    }
  }

  function updateEducationItem(index: number, patch: Partial<EducationDraft>) {
    updateDraft("mainEducation", draft.mainEducation.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function addEducationItem() {
    const nextEducationItem = createEducationDraft();

    pendingScrollTargetRef.current = nextEducationItem.id;
    updateDraft("mainEducation", [...draft.mainEducation, nextEducationItem]);
  }

  function removeEducationItem(index: number) {
    const nextEducationItems = draft.mainEducation.filter((_, itemIndex) => itemIndex !== index);

    updateDraft(
      "mainEducation",
      nextEducationItems.length > 0 ? nextEducationItems : [createEducationDraft()],
    );
  }

  function setTrainings(nextTrainings: TrainingDraft[]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      methods: nextTrainings
        .map((training) => training.approach)
        .filter(Boolean),
      trainings: nextTrainings,
    }));
    setStepError("");
    setFormError("");
  }

  function updateTrainingItem(index: number, patch: Partial<TrainingDraft>) {
    setTrainings(draft.trainings.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  }

  function addTrainingItem() {
    const nextTrainingItem = createTrainingDraft();

    pendingScrollTargetRef.current = nextTrainingItem.id;
    setTrainings([...draft.trainings, nextTrainingItem]);
  }

  function removeTrainingItem(index: number) {
    const nextTrainings = draft.trainings.filter((_, itemIndex) => itemIndex !== index);

    setTrainings(nextTrainings.length > 0 ? nextTrainings : [createTrainingDraft()]);
  }

  function updateMessengerContact(key: "telegram" | "whatsapp", value: string) {
    updateDraft("contacts", {
      ...draft.contacts,
      [key]: {
        ...draft.contacts[key],
        isPublic: true,
        value,
      },
    });
  }

  function updateEmailContact(value: string) {
    updateDraft("contacts", {
      ...draft.contacts,
      email: {
        ...draft.contacts.email,
        isPublic: true,
        value,
      },
    });
  }

  function updatePreferredContact(value: PreferredContactKey) {
    const nextContacts = { ...draft.contacts };

    if (value === "whatsapp" && !nextContacts.whatsapp.value.trim()) {
      nextContacts.whatsapp = {
        ...nextContacts.whatsapp,
        isPublic: true,
      };
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      contacts: nextContacts,
      selectedPublicContact: value,
    }));
    setStepError("");
    setFormError("");
  }

  function startResendCooldown() {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((currentValue) => {
        if (currentValue <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
          }

          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);
  }

  async function sendContactCode() {
    setIsContactSubmitting(true);
    setContactCodeError("");

    try {
      const response = await fetch("/api/specialist-applications/contact-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: draft.email.trim() }),
      });
      const payload = (await response.json()) as AdminManagedUserErrorResponse & {
        debugOtpCode?: string;
      };

      if (!response.ok) {
        setContactCodeError(payload.fieldErrors?.email ?? payload.error ?? "Не удалось отправить код.");
        return false;
      }

      setDebugContactCode(payload.debugOtpCode ?? "");
      setContactCode("");
      startResendCooldown();
      return true;
    } catch {
      setContactCodeError("Не удалось отправить код. Попробуйте еще раз.");
      return false;
    } finally {
      setIsContactSubmitting(false);
    }
  }

  async function verifyContactCode(code: string) {
    setIsContactSubmitting(true);
    setContactCodeError("");

    try {
      const response = await fetch("/api/specialist-applications/contact-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email: draft.email.trim(),
        }),
      });
      const payload = (await response.json()) as AdminManagedUserErrorResponse;

      if (!response.ok) {
        setContactCodeError(payload.error ?? "Не удалось проверить код.");
        setContactCode("");
        return;
      }

      const nextDraft = {
        ...draft,
        contactVerified: true,
      };

      setDraft(nextDraft);
      persistSpecialistApplicationDraft(nextDraft, "specialization");
      commitScreen("specialization");
      setContactCode("");
    } catch {
      setContactCodeError("Не удалось проверить код. Попробуйте еще раз.");
      setContactCode("");
    } finally {
      setIsContactSubmitting(false);
    }
  }

  function returnToEntryScreen() {
    persistSpecialistApplicationDraft(draft, "general");
    setScreen("general");

    if (mode === "application") {
      router.push("/for-psychologists");
    }
  }

  function handleBack() {
    const currentIndex = getApplicationStepIndex(screen);

    if (currentIndex <= 0) {
      returnToEntryScreen();
      return;
    }

    commitScreen(APPLICATION_STEPS[currentIndex - 1]?.id ?? "specialization");
  }

  function handleCategorySelect(categoryId: FlowCategoryId) {
    const range = getCategoryStepRange(categoryId);

    if (range.first <= sidebarFurthestStepIndex) {
      commitScreen(APPLICATION_STEPS[range.first]?.id ?? "specialization");
    }
  }

  function handleNext() {
    const currentIndex = getApplicationStepIndex(screen);

    if (currentIndex < 0) {
      return;
    }

    if (!isStepComplete(APPLICATION_STEPS[currentIndex].id, draft)) {
      setStepError(REQUIRED_STEP_ERROR);
      return;
    }

    const nextStep = APPLICATION_STEPS[currentIndex + 1];

    if (nextStep) {
      commitScreen(nextStep.id);
      return;
    }

    void handleSubmit();
  }

  async function handleSubmit() {
    const firstIncompleteStep = APPLICATION_STEPS.find((step) => (
      !isStepComplete(step.id, draft)
    ));

    if (firstIncompleteStep) {
      commitScreen(firstIncompleteStep.id);
      setStepError(REQUIRED_STEP_ERROR);
      return;
    }

    setFormError("");
    const selectedContact = getPreferredContactKey(draft.selectedPublicContact);

    let avatarUrl: string | null = null;

    try {
      avatarUrl = await buildCroppedPhotoDataUrl(draft.photoUrl, draft.photoCropRect);
    } catch {
      setFormError("Не удалось подготовить фото. Попробуйте загрузить его еще раз.");
      return;
    }

    const submittedDraft = {
      ...draft,
      applicationStatus: "pending_review" as const,
      selectedPublicContact: selectedContact,
    };

    void fetch("/api/specialist-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarCardUrl: null,
        avatarSourceUrl: draft.photoUrl,
        avatarUrl,
        education: buildEducationPayload(draft),
        email: draft.email.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        patronymic: draft.patronymic.trim(),
        profileDescription: buildProfileDescription(draft),
        role: "specialist",
        specialties: draft.trainings
          .map((training) => training.approach.trim())
          .filter(Boolean),
        specialistApplication: {
          status: "pending_review",
          submittedAt: new Date().toISOString(),
          version: 2,
          draft: submittedDraft,
        },
        specialistBirthDate: draft.specialistBirthDate,
        specialistGender: draft.specialistGender,
        specialistPhoneCountry: null,
        specialistPhoneNumber: null,
        specialistTelegramUrl: selectedContact === "telegram"
          ? normalizeTelegramUrl(draft.contacts.telegram.value)
          : null,
        specialistWhatsappUrl: selectedContact === "whatsapp"
          ? normalizeWhatsappUrl(getContactValue(draft, "whatsapp"))
          : null,
        workTopics: draft.workTopics,
      }),
    }).catch(() => undefined);

    setDraft(submittedDraft);
    persistSpecialistApplicationDraft(submittedDraft, "success");
    commitScreen("success");
  }

  function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    handleNext();
  }

  function renderStepContent() {
    switch (activeStep) {
      case "specialization":
        return {
          title: "Какую специальность хотите подтвердить?",
          description: "Выберите один или несколько вариантов. Детали можно будет уточнить позже.",
          content: (
            <CheckCards
              options={SPECIALIZATION_OPTIONS}
              value={draft.specializations}
              onChange={(value) => updateDraft("specializations", value)}
            />
          ),
        };
      case "education-school":
        return {
          title: "Какое у вас высшее образование?",
          description: "Подойдет диплом о любом высшем образовании, не обязательно психологическом.",
          content: (
            <div className="grid gap-6">
              {draft.mainEducation.map((education, index) => (
                <div
                  key={education.id}
                  data-flow-item-id={education.id}
                  className={cn(
                    "grid gap-6",
                    index > 0
                      ? "border-t border-[var(--separator-primary)] pt-6"
                      : "",
                  )}
                >
                  {draft.mainEducation.length > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[16px] font-semibold leading-6 text-[var(--label-primary)]">
                        Образование {index + 1}
                      </p>
                      {index > 0 ? (
                        <Button
                          type="button"
                          variant="quaternary-accent"
                          size="sm"
                          onPress={() => removeEducationItem(index)}
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <FlowTextInput
                    label="ВУЗ"
                    placeholder="Укажите название вуза"
                    value={education.institution}
                    onChange={(event) => updateEducationItem(index, {
                      institution: event.target.value,
                    })}
                  />
                  <FlowTextInput
                    label="Специальность"
                    placeholder="Укажите специальность по диплому"
                    value={education.program}
                    onChange={(event) => updateEducationItem(index, {
                      program: event.target.value,
                    })}
                  />
                  <div className="grid gap-6 min-[560px]:grid-cols-2">
                    <FlowTextInput
                      inputMode="numeric"
                      label="Год начала"
                      maxLength={4}
                      placeholder="2008"
                      value={education.startYear}
                      onChange={(event) => updateEducationItem(index, {
                        startYear: event.target.value.replace(/\D/g, ""),
                      })}
                    />
                    <FlowTextInput
                      inputMode="numeric"
                      label="Год окончания"
                      maxLength={4}
                      placeholder="2012"
                      value={education.completionYear}
                      onChange={(event) => updateEducationItem(index, {
                        completionYear: event.target.value.replace(/\D/g, ""),
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <span className={fieldControlLabelClassName}>
                      Фото диплома
                    </span>
                    <CompactUploadField
                      documents={education.documents}
                      emptyTitle="Добавить диплом"
                      id={`education-document-upload-${education.id}`}
                      onChange={(documents) => updateEducationItem(index, { documents })}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full justify-center [&_svg]:!size-5"
                onPress={addEducationItem}
              >
                <FlowPlusCircleIcon />
                Добавить образование
              </Button>
            </div>
          ),
        };
      case "methods-choice":
        return {
          title: "Какой психотерапевтический метод вы изучили?",
          content: (
            <div className="grid gap-6">
              {draft.trainings.map((training, index) => (
                <div
                  key={training.id}
                  data-flow-item-id={training.id}
                  className={cn(
                    "grid gap-6",
                    index > 0
                      ? "border-t border-[var(--separator-primary)] pt-6"
                      : "",
                  )}
                >
                  {draft.trainings.length > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[16px] font-semibold leading-6 text-[var(--label-primary)]">
                        Метод {index + 1}
                      </p>
                      {index > 0 ? (
                        <Button
                          type="button"
                          variant="quaternary-accent"
                          size="sm"
                          onPress={() => removeTrainingItem(index)}
                        >
                          Удалить
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <FlowTextInput
                    label="Институт или программа"
                    placeholder="Институт гештальта"
                    value={training.institution}
                    onChange={(event) => updateTrainingItem(index, {
                      institution: event.target.value,
                    })}
                  />
                  <SelectField
                    label="Метод"
                    placeholder="Выберите метод"
                    value={training.approach}
                    options={METHOD_SELECT_OPTIONS}
                    onChange={(value) => updateTrainingItem(index, { approach: value })}
                  />
                  <div className="grid gap-6 min-[560px]:grid-cols-2">
                    <FlowTextInput
                      inputMode="numeric"
                      label="Год начала"
                      maxLength={4}
                      placeholder="2020"
                      value={training.startYear}
                      onChange={(event) => updateTrainingItem(index, {
                        startYear: event.target.value.replace(/\D/g, ""),
                      })}
                    />
                    <FlowTextInput
                      inputMode="numeric"
                      label="Год окончания"
                      maxLength={4}
                      placeholder="2022"
                      value={training.endYear}
                      onChange={(event) => updateTrainingItem(index, {
                        endYear: event.target.value.replace(/\D/g, ""),
                      })}
                    />
                  </div>
                  <div className="grid gap-6">
                    <div className="grid gap-1">
                      <p className="text-[18px] font-semibold leading-7 text-[var(--label-primary)]">
                        Сколько часов курса вы прошли?
                      </p>
                      <p className="text-[16px] leading-6 text-[var(--label-primary)]">
                        Укажите объем обучения к настоящему времени (в академических часах)
                      </p>
                    </div>
                    <div className="grid gap-6 min-[560px]:grid-cols-2">
                      <FlowBareInput
                        aria-label="Количество часов курса"
                        inputMode="numeric"
                        placeholder="500"
                        suffix="ч"
                        value={training.academicHours}
                        onChange={(event) => updateTrainingItem(index, {
                          academicHours: event.target.value.replace(/\D/g, ""),
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <span className={fieldControlLabelClassName}>
                      Фото документа (сертификата, диплома, удостоверения)
                    </span>
                    <CompactUploadField
                      documents={training.documents}
                      emptyTitle="Добавить документ"
                      id={`training-document-upload-${training.id}`}
                      onChange={(documents) => updateTrainingItem(index, { documents })}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full justify-center [&_svg]:!size-5"
                onPress={addTrainingItem}
              >
                <FlowPlusCircleIcon />
                Добавить метод
              </Button>
            </div>
          ),
        };
      case "practice-start":
        return {
          title: "С какого года вы консультируете?",
          content: (
            <FlowTextInput
              autoFocus
              inputMode="numeric"
              label="Год начала практики"
              maxLength={4}
              placeholder="2020"
              value={draft.consultSinceYear}
              onChange={(event) => updateDraft(
                "consultSinceYear",
                event.target.value.replace(/\D/g, ""),
              )}
            />
          ),
        };
      case "practice-format":
        return {
          title: "В каком формате вы работаете?",
          content: (
            <div className="grid gap-6">
              <RadioCards
                name="work-format"
                options={WORK_FORMAT_OPTIONS}
                value={draft.workFormat}
                onChange={(value) => updateDraft("workFormat", value)}
              />
              {draft.workFormat === "offline" || draft.workFormat === "hybrid" ? (
                <FlowTextInput
                  label="Город"
                  placeholder="Москва"
                  value={draft.city}
                  onChange={(event) => updateDraft("city", event.target.value)}
                />
              ) : null}
            </div>
          ),
        };
      case "practice-price":
        return {
          title: "Сколько вы берете за консультацию?",
          content: (
            <div className="grid gap-6 min-[560px]:grid-cols-2">
              <FlowTextInput
                inputMode="numeric"
                label="Стоимость"
                placeholder="4000"
                suffix="₽"
                value={draft.price}
                onChange={(event) => updateDraft(
                  "price",
                  event.target.value.replace(/[^\d\s]/g, ""),
                )}
              />
              <FlowTextInput
                label="Длительность"
                placeholder="60"
                suffix="мин"
                value={draft.duration}
                onChange={(event) => updateDraft("duration", event.target.value)}
              />
            </div>
          ),
        };
      case "supervision-status":
        return {
          title: "Проходите ли вы супервизию?",
          content: (
            <RadioCards
              name="supervision-status"
              options={SUPERVISION_STATUS_OPTIONS}
              value={draft.supervisionStatus}
              onChange={(value) => updateDraft("supervisionStatus", value)}
            />
          ),
        };
      case "supervision-frequency":
        return {
          title: "Как часто вы проходите супервизии?",
          description: "Индивидуально или в группе до 10 человек",
          content: isSupervisionPositive(draft.supervisionStatus) ? (
            <RadioCards
              name="supervision-frequency"
              options={SUPERVISION_FREQUENCY_OPTIONS}
              value={draft.supervisionFrequency}
              onChange={(value) => updateDraft("supervisionFrequency", value)}
            />
          ) : (
            <div className="rounded-[18px] bg-[var(--fill-quaternary)] px-4 py-3 text-[16px] leading-6 text-[var(--label-secondary)]">
              Продолжим без дополнительных полей.
            </div>
          ),
        };
      case "personal-therapy":
        return {
          title: "Проходите ли вы личную терапию?",
          description: "Это поле не будет публичным.",
          content: (
            <RadioCards
              name="personal-therapy"
              options={PERSONAL_THERAPY_OPTIONS}
              value={draft.personalTherapyStatus}
              onChange={(value) => updateDraft("personalTherapyStatus", value)}
            />
          ),
        };
      case "profile-photo":
        return {
          title: "Фото",
          description:
            "Подойдет цветное фото, с хорошим освещением и где хорошо видно ваше лицо. Это фото будет отображаться в вашей анкете на платформе.",
          content: (
            <PhotoUploadField
              cropRect={draft.photoCropRect}
              value={draft.photoUrl}
              onChange={updatePhoto}
              onCropChange={updatePhotoCropRect}
            />
          ),
        };
      case "profile-contact":
        return {
          title: "Контакты",
          description: "Каким способом нам связаться с вами?",
          content: (
            <ContactPreferenceTabs
              draft={draft}
              onEmailChange={updateEmailContact}
              onSelect={updatePreferredContact}
              onTelegramChange={(value) => updateMessengerContact("telegram", value)}
              onWhatsappChange={(value) => updateMessengerContact("whatsapp", value)}
            />
          ),
        };
    }
  }

  if (!isReady) {
    return (
      <div className="mx-auto min-h-[680px] w-full max-w-[1120px] rounded-[24px] bg-[var(--background-primary)]" />
    );
  }

  if (screen === "general") {
    return (
      <GeneralFallback
        onStart={() => {
          if (mode === "entry") {
            router.push("/for-psychologists");
            return;
          }

          commitScreen(draft.contactVerified ? "specialization" : "contact");
        }}
      />
    );
  }

  if (screen === "success") {
    return (
      <section
        className="mx-auto grid min-h-[560px] w-full max-w-[936px] content-center justify-items-center gap-6 rounded-[24px] bg-[var(--background-primary)] p-8 text-center"
        data-typography-system
      >
        <VerifiedSpecialistIcon size={48} />
        <div className="grid w-full max-w-[384px] gap-3">
          <h2 className="type-h2 font-semibold text-[var(--label-primary)]">
            Спасибо, получили вашу заявку!
          </h2>
          <p className="mx-auto max-w-full text-[14px] leading-5 text-[var(--label-secondary)]">
            Рассмотрим ее и в течение трех дней дадим ответ
            на указанную вами почту
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onPress={() => router.push("/")}
        >
          На главную
        </Button>
      </section>
    );
  }

  if (screen === "contact") {
    return (
      <ContactConfirmationStep
        code={contactCode}
        debugCode={debugContactCode}
        email={draft.email}
        error={contactCodeError}
        isSubmitting={isContactSubmitting}
        onBack={returnToEntryScreen}
        onCodeChange={(value) => {
          setContactCode(value);
          setContactCodeError("");
        }}
        onResend={() => {
          void sendContactCode();
        }}
        resendCooldown={resendCooldown}
      />
    );
  }

  const renderedStep = renderStepContent();

  return (
    <div className="mx-auto flex h-full w-full max-w-[936px] flex-col">
      <MobileFlowNavigation
        activeCategory={activeCategory}
        activeIndex={activeStepIndex}
        furthestIndex={sidebarFurthestStepIndex}
        isOpen={isMobileNavigationOpen}
        onClose={returnToEntryScreen}
        onOpenChange={setIsMobileNavigationOpen}
        onSelectCategory={handleCategorySelect}
      />

      <div className="grid min-h-0 flex-1 gap-6 min-[900px]:grid-cols-[280px_640px]">
        <aside className="hidden min-[900px]:block">
          <div className="sticky top-0">
            <FlowSidebar
              activeIndex={activeStepIndex}
              furthestIndex={sidebarFurthestStepIndex}
              onSelectCategory={handleCategorySelect}
            />
          </div>
        </aside>

        <form
          onSubmit={handleStepSubmit}
          className="h-full min-h-0 min-w-0"
        >
          <StepFrame
            contentRef={stepContentRef}
            description={renderedStep.description}
            error={stepError || formError}
            isBackDisabled={isSubmitting}
            isContinueDisabled={!canContinue}
            isSubmitting={isSubmitting}
            nextIcon={activeStepIndex === APPLICATION_STEPS.length - 1
              ? <CheckIndicatorIcon />
              : undefined}
            nextLabel={activeStepIndex === APPLICATION_STEPS.length - 1
              ? "Завершить"
              : "Продолжить"}
            title={renderedStep.title}
            onBack={handleBack}
          >
            {renderedStep.content}
          </StepFrame>
        </form>
      </div>
    </div>
  );
}
