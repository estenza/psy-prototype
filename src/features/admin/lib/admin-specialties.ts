export {
  getTherapeuticApproachTone as getAdminSpecialtyTone,
  normalizeTherapeuticApproaches as normalizeAdminSpecialties,
  THERAPEUTIC_APPROACH_ENTITIES as ADMIN_SPECIALTY_ENTITIES,
  THERAPEUTIC_APPROACH_OPTIONS as ADMIN_SPECIALTY_OPTIONS,
} from "@/features/specialists/lib/therapeutic-approaches";

export type {
  TherapeuticApproachEntity as AdminSpecialtyEntity,
  TherapeuticApproachLabel as AdminSpecialty,
} from "@/features/specialists/lib/therapeutic-approaches";
