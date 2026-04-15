import { Link } from "@/components/ui/link";

type LegalInfoProps = {
  className?: string;
};

const legalItems = [
  { href: "/terms", label: "Условия" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/cookies", label: "Cookies" },
  { href: "/community-guidelines", label: "Правила сообщества" },
  { href: "/contacts", label: "Контакты" },
] as const;

export function LegalInfo({ className = "" }: LegalInfoProps) {
  return (
    <section className={`text-label-tertiary text-xs leading-5 ${className}`.trim()}>
      <p>© 2026 внутри</p>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
        {legalItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
