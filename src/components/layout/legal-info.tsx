type LegalInfoProps = {
  className?: string;
};

const legalItems = [
  "Условия",
  "Конфиденциальность",
  "Cookies",
  "Правила сообщества",
  "Контакты",
] as const;

export function LegalInfo({ className = "" }: LegalInfoProps) {
  return (
    <section className={`text-label-tertiary text-xs leading-5 ${className}`.trim()}>
      <p>© 2026 внутри</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {legalItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}
