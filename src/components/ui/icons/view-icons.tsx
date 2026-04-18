export function CardViewIcon() {
  return <CardModeIcon />;
}

export function CardModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      {filled ? (
        <path
          d="M18.25 14.167C18.2498 16.4219 16.4219 18.2498 14.167 18.25H5.83301C3.5781 18.2498 1.75018 16.4219 1.75 14.167V10.75H18.25V14.167ZM14.167 1.75C16.4219 1.75018 18.2498 3.5781 18.25 5.83301V9.25H1.75V5.83301C1.75018 3.5781 3.5781 1.75018 5.83301 1.75H14.167Z"
          fill="currentColor"
        />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.0407 2C16.2273 2.00017 17.9998 3.77271 18 5.95928V14.0407C17.9998 16.2273 16.2273 17.9998 14.0407 18H5.95928C3.77271 17.9998 2.00017 16.2273 2 14.0407V5.95928C2.00017 3.77271 3.77271 2.00017 5.95928 2H14.0407ZM3.45455 10.7273V14.0407C3.45472 15.424 4.57603 16.5453 5.95928 16.5455H14.0407C15.424 16.5453 16.5453 15.424 16.5455 14.0407V10.7273H3.45455ZM5.95928 3.45455C4.57603 3.45472 3.45472 4.57603 3.45455 5.95928V9.27273H16.5455V5.95928C16.5453 4.57603 15.424 3.45472 14.0407 3.45455H5.95928Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

export function CompactViewIcon() {
  return <CompactModeIcon />;
}

export function CompactModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      {filled ? (
        <path
          d="M18.2505 14.167C18.2503 16.4217 16.4222 18.2496 14.1675 18.25H5.8335C3.57859 18.2498 1.75049 16.4219 1.75049 14.167V13.5H18.2505V14.167ZM18.2505 12H1.75049V8H18.2505V12ZM14.1675 1.75C16.4222 1.75044 18.2503 3.57827 18.2505 5.83301V6.5H1.75049V5.83301C1.75066 3.5781 3.57859 1.75018 5.8335 1.75H14.1675Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M16.5459 13.1515H3.45503V14.0407C3.4552 15.4241 4.57637 16.5455 5.95977 16.5455H14.0403C15.4237 16.5455 16.5458 15.4241 16.5459 14.0407V13.1515ZM3.45503 11.697H16.5459V8.30303H3.45503V11.697ZM16.5459 5.95928C16.5458 4.57592 15.4237 3.45455 14.0403 3.45455H5.95977C4.57637 3.45455 3.4552 4.57592 3.45503 5.95928V6.84848H16.5459V5.95928ZM18.0005 14.0407C18.0003 16.2274 16.227 18 14.0403 18H5.95977C3.77305 18 2.00066 16.2274 2.00049 14.0407V5.95928C2.00066 3.7726 3.77305 2 5.95977 2H14.0403C16.227 2 18.0003 3.7726 18.0005 5.95928V14.0407Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

export function ForumViewIcon() {
  return <ForumModeIcon />;
}

export function ForumModeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
