export function CardViewIcon() {
  return <CardModeIcon />;
}

export function CardModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
      {filled ? (
        <path
          d="M22 17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V13H22V17ZM17 2C19.7614 2 22 4.23858 22 7V11H2V7C2 4.23858 4.23858 2 7 2H17Z"
          fill="currentColor"
        />
      ) : (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M4 12L20 12" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function CompactViewIcon() {
  return <CompactModeIcon />;
}

export function CompactModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
      {filled ? (
        <path
          d="M22 17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V16.5H22V17ZM22 14.5H2V9.5H22V14.5ZM17 2C19.7614 2 22 4.23858 22 7V7.5H2V7C2 4.23858 4.23858 2 7 2H17Z"
          fill="currentColor"
        />
      ) : (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M2.5 9H20.5" stroke="currentColor" strokeWidth="2" />
          <path d="M2.5 15H20.5" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function ForumViewIcon() {
  return <ForumModeIcon />;
}

export function ForumModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
      <path
        d="M9 12H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 5H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 19H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="4" cy="5" r={filled ? "2.5" : "2"} fill="currentColor" />
      <circle cx="4" cy="12" r={filled ? "2.5" : "2"} fill="currentColor" />
      <circle cx="4" cy="19" r={filled ? "2.5" : "2"} fill="currentColor" />
    </svg>
  );
}
