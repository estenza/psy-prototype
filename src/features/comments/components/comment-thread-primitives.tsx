import type { CSSProperties, ReactNode, Ref } from "react";

export const COMMENT_AVATAR_SIZE = 36;
export const COMMENT_BRANCH_GAP = 8;
export const COMMENT_BRANCH_X = 18;
export const COMMENT_BRANCH_DEFAULT_TOP = COMMENT_AVATAR_SIZE + COMMENT_BRANCH_GAP;
export const COMMENT_BRANCH_GLYPH_SIZE = 20;
export const COMMENT_BRANCH_REPLY_CENTER = 18;
export const COMMENT_BRANCH_ELBOW_RADIUS = 12;
export const COMMENT_BRANCH_ACCENT = "lab(54.5335 3.31545 -66.5298)";

export function getCommentBranchStrokeColor(highlighted: boolean) {
  return highlighted ? COMMENT_BRANCH_ACCENT : "var(--separator-primary)";
}

export function getCommentBranchTextColor(highlighted: boolean) {
  return highlighted ? COMMENT_BRANCH_ACCENT : "var(--label-secondary)";
}

export function CommentThreadToggleGlyph({
  isOpen,
  highlighted: _highlighted = false,
}: {
  isOpen: boolean;
  highlighted?: boolean;
}) {
  void _highlighted;

  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-white" />
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="relative"
      >
        {isOpen ? (
          <>
            <path
              d="M11 7.25C11.4142 7.25 11.75 7.58579 11.75 8C11.75 8.41421 11.4142 8.75 11 8.75H5C4.58579 8.75 4.25 8.41421 4.25 8C4.25 7.58579 4.58579 7.25 5 7.25H11Z"
              fill="currentColor"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 0.25C12.2802 0.25 15.75 3.71979 15.75 8C15.75 12.2802 12.2802 15.75 8 15.75C3.71979 15.75 0.25 12.2802 0.25 8C0.25 3.71979 3.71979 0.25 8 0.25ZM8 1.75C4.54822 1.75 1.75 4.54822 1.75 8C1.75 11.4518 4.54822 14.25 8 14.25C11.4518 14.25 14.25 11.4518 14.25 8C14.25 4.54822 11.4518 1.75 8 1.75Z"
              fill="currentColor"
            />
          </>
        ) : (
          <path
            d="M8 0.25C12.2802 0.25 15.75 3.71979 15.75 8C15.75 12.2802 12.2802 15.75 8 15.75C3.71979 15.75 0.25 12.2802 0.25 8C0.25 3.71979 3.71979 0.25 8 0.25ZM8 1.75C4.54822 1.75 1.75 4.54822 1.75 8C1.75 11.4518 4.54822 14.25 8 14.25C11.4518 14.25 14.25 11.4518 14.25 8C14.25 4.54822 11.4518 1.75 8 1.75ZM8 4.25C8.41421 4.25 8.75 4.58579 8.75 5V7.25H11C11.4142 7.25 11.75 7.58579 11.75 8C11.75 8.41421 11.4142 8.75 11 8.75H8.75V11C8.75 11.4142 8.41421 11.75 8 11.75C7.58579 11.75 7.25 11.4142 7.25 11V8.75H5C4.58579 8.75 4.25 8.41421 4.25 8C4.25 7.58579 4.58579 7.25 5 7.25H7.25V5C7.25 4.58579 7.58579 4.25 8 4.25Z"
            fill="currentColor"
          />
        )}
      </svg>
    </span>
  );
}

export function CommentThreadNodeButton({
  onClick,
  onHoverChange,
  isOpen,
  highlighted = false,
  glyphFirst = false,
  ariaLabel,
  ariaExpanded,
  className,
  style,
  buttonRef,
  glyphClassName,
  glyphStyle,
  children,
}: {
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
  isOpen: boolean;
  highlighted?: boolean;
  glyphFirst?: boolean;
  ariaLabel: string;
  ariaExpanded?: boolean;
  className: string;
  style?: CSSProperties;
  buttonRef?: Ref<HTMLButtonElement>;
  glyphClassName?: string;
  glyphStyle?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      ref={buttonRef}
      className={className}
      style={{
        color: getCommentBranchTextColor(highlighted),
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
    >
      {glyphFirst ? (
        <>
          <span
            className={glyphClassName ?? "flex flex-none items-center justify-center text-current"}
            style={{
              width: `${COMMENT_BRANCH_GLYPH_SIZE}px`,
              height: `${COMMENT_BRANCH_GLYPH_SIZE}px`,
              ...glyphStyle,
            }}
          >
            <CommentThreadToggleGlyph isOpen={isOpen} highlighted={highlighted} />
          </span>
          {children}
        </>
      ) : (
        <>
          {children}
          <span
            className={glyphClassName ?? "flex flex-none items-center justify-center text-current"}
            style={{
              width: `${COMMENT_BRANCH_GLYPH_SIZE}px`,
              height: `${COMMENT_BRANCH_GLYPH_SIZE}px`,
              ...glyphStyle,
            }}
          >
            <CommentThreadToggleGlyph isOpen={isOpen} highlighted={highlighted} />
          </span>
        </>
      )}
    </button>
  );
}

export function CommentThreadElbow({
  highlighted = false,
  className,
  style,
}: {
  highlighted?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`absolute border-b border-l rounded-bl-[12px] transition-colors ${className ?? ""}`}
      style={{
        borderColor: getCommentBranchStrokeColor(highlighted),
        ...style,
      }}
    />
  );
}
