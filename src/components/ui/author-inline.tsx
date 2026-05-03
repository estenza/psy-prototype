import Link from "next/link";
import type { ReactNode } from "react";
import { UserAvatarAction } from "@/components/ui/user-avatar-action";

type AuthorInlineProps = {
  avatarUrl: string | null | undefined;
  handle: string;
  name: string;
  meta: string;
  compactMeta?: string;
  afterMeta?: ReactNode;
  avatarSize?: "comment-md" | "comment-sm" | "header" | "lg" | "md" | "sm";
  showStatusDot?: boolean;
  profileHref?: string | null;
  avatarHref?: string | null;
  nameHref?: string | null;
  className?: string;
  metaRowClassName?: string;
  nameClassName?: string;
  handleClassName?: string;
  metaClassName?: string;
};

function getHandleInitial(handle: string, name: string) {
  const normalizedHandle = handle.replace(/^@+/, "").trim();
  const fallbackSource = normalizedHandle || name.trim();

  return fallbackSource.charAt(0).toUpperCase() || "U";
}

export function AuthorInline({
  avatarUrl,
  handle,
  name,
  meta,
  compactMeta,
  afterMeta,
  avatarSize = "comment-md",
  showStatusDot = false,
  profileHref = null,
  avatarHref,
  nameHref,
  className = "",
  metaRowClassName = "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5",
  nameClassName = "text-label-primary relative z-10 max-w-full break-words text-[14px] leading-5 font-medium",
  handleClassName = "text-label-tertiary max-w-full break-words text-[14px] leading-5",
  metaClassName = "text-label-tertiary flex shrink-0 items-center gap-1.5 text-[14px] leading-5",
}: AuthorInlineProps) {
  const resolvedAvatarHref = avatarHref ?? profileHref;
  const resolvedNameHref = nameHref ?? profileHref;

  return (
    <div className={`flex min-w-0 items-start gap-3 ${className}`.trim()}>
      <UserAvatarAction
        avatarUrl={avatarUrl}
        avatarSeed={handle}
        fallbackText={getHandleInitial(handle, name)}
        name={name}
        showStatusDot={showStatusDot}
        size={avatarSize}
        href={resolvedAvatarHref}
        ariaLabel={`Открыть профиль ${name}`}
      />

      <div className={metaRowClassName}>
        {resolvedNameHref ? (
          <Link
            href={resolvedNameHref}
            className={`pointer-events-auto rounded-none p-0 no-underline transition-[text-decoration-color] duration-100 ease-out hover:underline focus-visible:underline decoration-[color:var(--underline-primary)] decoration-[1.5px] underline-offset-4 ${nameClassName}`.trim()}
          >
            {name}
          </Link>
        ) : (
          <span className={nameClassName}>
            {name}
          </span>
        )}
        <span className={handleClassName}>
          {handle}
        </span>
        <div className={metaClassName}>
          <span aria-hidden="true">•</span>
          {compactMeta ? (
            <>
              <span className="min-[480px]:hidden">{compactMeta}</span>
              <span className="hidden min-[480px]:inline">{meta}</span>
            </>
          ) : (
            <span>{meta}</span>
          )}
        </div>
        {afterMeta}
      </div>
    </div>
  );
}
