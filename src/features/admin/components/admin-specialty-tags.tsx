"use client";

type AdminSpecialtyTagsProps = {
  specialties: string[];
};

export function AdminSpecialtyTags({ specialties }: AdminSpecialtyTagsProps) {
  if (specialties.length === 0) {
    return <span className="text-[var(--label-tertiary)]">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {specialties.map((specialty) => (
        <span
          key={specialty}
          className="inline-flex items-center rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[14px] font-normal leading-5 text-[var(--accent-primary)]"
        >
          {specialty}
        </span>
      ))}
    </div>
  );
}
