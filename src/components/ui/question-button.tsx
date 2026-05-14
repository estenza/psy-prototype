export const questionButtonClassName =
  "inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(120,120,128,0.16)] text-[var(--label-tertiary)] transition-colors hover:bg-[rgba(120,120,128,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-soft)]";

export function QuestionButtonIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.99999 8.99609C6.55227 8.9961 6.99999 9.44381 6.99999 9.99609C6.99972 10.5481 6.5521 10.9961 5.99999 10.9961C5.44787 10.9961 5.00025 10.5482 4.99999 9.99609C4.99999 9.44381 5.4477 8.99609 5.99999 8.99609Z"
        fill="currentColor"
      />
      <path
        d="M5.96776 1.24512C7.42362 1.24512 8.75 2.31984 8.74999 3.81445C8.74971 4.98043 8.04355 5.57627 7.55956 5.98047C7.05622 6.40082 6.78573 6.63378 6.70897 7.11426C6.64345 7.523 6.25844 7.80155 5.8496 7.73633C5.44086 7.67095 5.16256 7.28669 5.22753 6.87793C5.40475 5.76788 6.14968 5.20401 6.59862 4.8291C7.06657 4.43828 7.24979 4.2384 7.24999 3.81445C7.24999 3.30077 6.75639 2.7461 5.96776 2.74609C5.31379 2.74618 4.8428 3.14287 4.72069 3.56738C4.6059 3.96488 4.19068 4.1943 3.79296 4.08008C3.39503 3.96561 3.16508 3.55028 3.27928 3.15234C3.60831 2.00862 4.72829 1.24521 5.96776 1.24512Z"
        fill="currentColor"
      />
    </svg>
  );
}
