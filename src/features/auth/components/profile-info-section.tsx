/* eslint-disable @next/next/no-img-element */

"use client";

import { Modal, Popover } from "@heroui/react";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button-styles";
import {
  QuestionButtonIcon,
  questionButtonClassName,
} from "@/components/ui/question-button";
import {
  ChevronDownSmallIcon,
  ChevronUpSmallIcon,
  CloseIcon,
} from "@/components/ui/icons";
import { getTherapeuticApproachDescription } from "@/features/specialists/lib/therapeutic-approaches";
import type {
  AuthUser,
  SpecialistAttachedDocument,
  SpecialistEducationItem,
} from "@/features/auth/types";

function ExpandToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex w-fit items-center gap-2 text-[16px] font-medium leading-6 text-[var(--accent-primary)]"
      aria-expanded={expanded}
      onClick={onClick}
    >
      <span>{expanded ? "Свернуть" : "Развернуть"}</span>
      {expanded ? <ChevronUpSmallIcon /> : <ChevronDownSmallIcon />}
    </button>
  );
}

export function ProfileAboutSection({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldClamp = description.length > 320;

  return (
    <section className="surface-elevated rounded-[28px] p-4 min-[480px]:p-6">
      <h4 className="type-h4 font-semibold text-[var(--label-primary)]">
        О психологе
      </h4>
      <p
        className="mt-5 whitespace-pre-wrap text-[16px] leading-6 text-[var(--label-primary)]"
        style={
          shouldClamp && !isExpanded
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 4,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {description}
      </p>
      {shouldClamp ? (
        <div className="mt-4">
          <ExpandToggle
            expanded={isExpanded}
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
          />
        </div>
      ) : null}
    </section>
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
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 10.25h6M6 13.25h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getEducationTitle(item: SpecialistEducationItem) {
  return [
    item.institution,
    item.program,
    item.approach,
  ].filter(Boolean).join(" · ");
}

function SpecialistDocumentPreviewModal({
  document,
  educationTitle,
  onClose,
}: {
  document: SpecialistAttachedDocument | null;
  educationTitle: string;
  onClose: () => void;
}) {
  if (!document) {
    return null;
  }

  const isImage = document.mimeType.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <Modal.Backdrop
      isOpen
      className="fixed inset-0 z-50 bg-[var(--overlay-scrim-strong)]"
    >
      <Modal.Container className="flex min-h-dvh items-center justify-center !p-4">
        <Modal.Dialog
          aria-label="Проверенный документ"
          className="surface-elevated grid max-h-[calc(100dvh-32px)] w-full max-w-[840px] overflow-hidden rounded-[28px] outline-none"
        >
          <Modal.Body className="grid gap-4 p-4 min-[480px]:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <h3 className="type-h3 font-semibold text-[var(--label-primary)]">
                  {document.name}
                </h3>
                <p className="text-[14px] leading-5 text-[var(--label-secondary)]">
                  Документ проверен модерацией
                </p>
                <p className="text-[14px] leading-5 text-[var(--label-tertiary)]">
                  {educationTitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть просмотр документа"
                className="interactive-quaternary inline-flex size-10 flex-none items-center justify-center rounded-full text-[var(--label-secondary)]"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="min-h-[320px] overflow-hidden rounded-[20px] bg-[var(--fill-secondary)]">
              {isImage ? (
                <img
                  src={document.url}
                  alt={document.name}
                  className="max-h-[70dvh] w-full object-contain"
                />
              ) : isPdf ? (
                <iframe
                  title={document.name}
                  src={document.url}
                  className="h-[70dvh] w-full"
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center p-6">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClassName({ variant: "primary" })}
                  >
                    Открыть документ
                  </a>
                </div>
              )}
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function ProfileEducationSection({
  education,
}: {
  education: SpecialistEducationItem[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    document: SpecialistAttachedDocument;
    educationTitle: string;
  } | null>(null);
  const shouldClamp = education.length > 2;
  const visibleEducation = shouldClamp && !isExpanded
    ? education.slice(0, 2)
    : education;

  return (
    <section className="surface-elevated rounded-[28px] p-4 min-[480px]:p-6">
      <h4 className="type-h4 font-semibold text-[var(--label-primary)]">
        Образование
      </h4>
      {visibleEducation.length > 0 ? (
        <div className="mt-5 grid gap-6 text-[16px] leading-6 text-[var(--label-primary)]">
          {visibleEducation.map((item, index) => {
            const verifiedDocuments = (item.documents ?? []).filter(
              (document) => document.status === "verified",
            );
            const educationTitle = getEducationTitle(item) || item.institution;

            return (
              <div key={`${item.year}-${index}`} className="grid gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span>{item.year}</span>
                  {verifiedDocuments.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      aria-label={`Открыть документ ${document.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--accent-primary)]"
                      onClick={() => setSelectedDocument({ document, educationTitle })}
                    >
                      <DocumentIcon />
                    </button>
                  ))}
                </div>
                <div>{item.institution}</div>
                {item.program || item.qualification || item.approach ? (
                  <div className="text-[14px] leading-5 text-[var(--label-secondary)]">
                    {[item.program, item.qualification, item.approach]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {shouldClamp ? (
        <div className="mt-4">
          <ExpandToggle
            expanded={isExpanded}
            onClick={() => setIsExpanded((currentValue) => !currentValue)}
          />
        </div>
      ) : null}
      <SpecialistDocumentPreviewModal
        document={selectedDocument?.document ?? null}
        educationTitle={selectedDocument?.educationTitle ?? ""}
        onClose={() => setSelectedDocument(null)}
      />
    </section>
  );
}

export function ProfileContactsSection({
  specialistMaxUrl,
  specialistTelegramUrl,
  specialistWhatsappUrl,
}: Pick<
  AuthUser,
  "specialistMaxUrl" | "specialistTelegramUrl" | "specialistWhatsappUrl"
>) {
  const contacts = [
    specialistTelegramUrl ? { href: specialistTelegramUrl, label: "Telegram" } : null,
    specialistMaxUrl ? { href: specialistMaxUrl, label: "Max" } : null,
    specialistWhatsappUrl ? { href: specialistWhatsappUrl, label: "WhatsApp" } : null,
  ].filter((contact): contact is { href: string; label: string } => Boolean(contact));

  if (contacts.length === 0) {
    return null;
  }

  return (
    <section className="surface-elevated rounded-[28px] p-4 min-[480px]:p-6">
      <h4 className="type-h4 font-semibold text-[var(--label-primary)]">
        Контакты
      </h4>
      <div className="mt-5 flex flex-wrap gap-2">
        {contacts.map((contact) => (
          <a
            key={contact.label}
            href={contact.href}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className={buttonClassName({
              className: "h-10 px-4 text-[16px] leading-6",
              variant: "secondary",
            })}
          >
            {contact.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function TherapyMethodItem({ specialty }: { specialty: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[16px] leading-6 text-[var(--label-primary)]">
      <span>{specialty}</span>
      <Popover.Root>
        <Popover.Trigger
          aria-label={`Что такое ${specialty}`}
          className={questionButtonClassName}
        >
          <QuestionButtonIcon />
        </Popover.Trigger>
        <Popover.Content placement="top" className="max-w-[280px]">
          <Popover.Dialog className="p-3 text-[14px] leading-5 text-[var(--label-primary)] outline-none">
            {getTherapeuticApproachDescription(specialty)}
          </Popover.Dialog>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Root>
    </span>
  );
}

export function ProfileTherapyMethodsSection({ specialties }: { specialties: string[] }) {
  return (
    <section className="surface-elevated grid gap-5 rounded-[28px] p-4 min-[480px]:p-6">
      <h4 className="type-h4 font-semibold text-[var(--label-primary)]">
        Метод терапии
      </h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {specialties.map((specialty) => (
          <TherapyMethodItem key={specialty} specialty={specialty} />
        ))}
      </div>
    </section>
  );
}

export function ProfileWorkTopicsSection({ workTopics }: { workTopics: string[] }) {
  return (
    <section className="surface-elevated grid gap-5 rounded-[28px] p-4 min-[480px]:p-6">
      <h4 className="type-h4 font-semibold text-[var(--label-primary)]">
        Работает с темами
      </h4>
      {workTopics.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[16px] leading-6 text-[var(--label-primary)]">
          {workTopics.map((workTopic) => (
            <span key={workTopic}>{workTopic}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
