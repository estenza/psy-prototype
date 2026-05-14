import type { SessionUser } from "@/features/auth/types";

function isOwner(actor: SessionUser | null, ownerUserId: string | null | undefined) {
  return Boolean(actor && ownerUserId && actor.id === ownerUserId);
}

export function canModerateContent(actor: SessionUser | null) {
  return Boolean(actor?.isModerator);
}

export function canAccessModeratorActions(actor: SessionUser | null) {
  return canModerateContent(actor);
}

export function canEditOwnPost(actor: SessionUser | null, ownerUserId: string | null | undefined) {
  return canModerateContent(actor) || isOwner(actor, ownerUserId);
}

export function canDeleteOwnComment(
  actor: SessionUser | null,
  ownerUserId: string | null | undefined,
) {
  return canModerateContent(actor) || isOwner(actor, ownerUserId);
}

export function isVerifiedSpecialist(actor: SessionUser | null | undefined) {
  return actor?.role === "specialist" && actor.specialistStatus === "verified";
}

export function canUsePublicActivity(actor: SessionUser | null | undefined) {
  return actor?.role !== "specialist" || isVerifiedSpecialist(actor);
}

export function canReplyAsSpecialist(actor: SessionUser | null) {
  return isVerifiedSpecialist(actor);
}

export const canReplyAsPsychologist = canReplyAsSpecialist;
