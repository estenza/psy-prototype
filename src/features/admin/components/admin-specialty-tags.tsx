"use client";

import { getAdminSpecialtyTone } from "@/features/admin/lib/admin-specialties";

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
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${getAdminSpecialtyTone(specialty)}`.trim()}
        >
          {specialty}
        </span>
      ))}
    </div>
  );
}
