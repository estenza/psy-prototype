import Link from "next/link";
import { AccountSectionShell } from "@/components/layout/account-section-shell";
import { AppBrand } from "@/components/layout/app-brand";
import { HistoryPageHeader } from "@/components/layout/history-page-header";
import { CheckIndicatorIcon } from "@/components/ui/icons";
import { SpecialistApplicationForm } from "@/features/specialists/components/specialist-application-form";
import { SpecialistApplicationFlow } from "@/features/specialists/components/specialist-application-flow";

const candidateRequirements = [
  <>
    Подтвержденное профильное образование (дипломы и сертификаты проверяются
    модерацией)
  </>,
  <>
    Опыт психологического консультирования от 1 года
  </>,
  <>
    Заполненный профиль с информацией об образовании, подходе и формате работы
  </>,
  <>
    Регулярная супервизия и дополнительное обучение будут преимуществом
  </>,
  <>
    Уважительное и бережное общение с пользователями платформы
  </>,
  <>
    Соблюдение{" "}
    <a
      href="#"
      className="cursor-pointer text-[var(--accent-primary)] underline-offset-2 hover:underline"
    >
      правил сообщества
    </a>{" "}
    и профессиональной этики
  </>,
];

function PsychologistsRequirementsSidebar() {
  return (
    <div
      data-allow-native-wheel="true"
      className="h-full overflow-y-auto px-6 pb-8 pt-10 xl:px-8"
    >
      <section className="grid gap-[44px]">
        <h2 className="type-h4 font-semibold text-[var(--label-primary)]">
          Что важно для нас
        </h2>

        <ul className="grid gap-5">
          {candidateRequirements.map((requirement, index) => (
            <li
              key={index}
              className="flex gap-3 text-[14px] leading-5 text-[var(--label-secondary)]"
            >
              <span className="mt-0.5 flex size-4 flex-none items-center justify-center text-[var(--accent-primary)]">
                <CheckIndicatorIcon />
              </span>
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SpecialistApplicationShell() {
  return (
    <main className="h-dvh overflow-hidden bg-[var(--background-secondary)] text-[var(--label-primary)]">
      <header>
        <div className="px-5 min-[720px]:px-10">
          <div className="mx-auto flex h-20 w-full max-w-[936px] items-center justify-between gap-4">
            <Link href="/" aria-label="внутри" className="text-[var(--accent-primary)]">
              <AppBrand wordmarkClassName="h-8 w-auto" labelClassName="hidden" />
            </Link>
          </div>
        </div>
      </header>

      <div className="h-[calc(100dvh-80px)] overflow-hidden bg-[var(--background-secondary)] px-5 pb-8 pt-2 min-[720px]:px-10">
        <SpecialistApplicationFlow mode="application" />
      </div>
    </main>
  );
}

export default async function ForPsychologistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    flow?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;

  if (resolvedSearchParams.flow === "application") {
    return <SpecialistApplicationShell />;
  }

  return (
    <AccountSectionShell
      activeSection="for-psychologists"
      header={<HistoryPageHeader title="Представьтесь" />}
      contentClassName="flex w-full min-w-0 flex-col gap-0"
      sidebarContent={<PsychologistsRequirementsSidebar />}
    >
      <SpecialistApplicationForm />
    </AccountSectionShell>
  );
}
