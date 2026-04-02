export function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7117 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0034 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92176 4.44061 8.37485 5.27072 7.03255C6.10083 5.69025 7.28825 4.60557 8.7 3.9C9.87812 3.30493 11.1801 2.99656 12.5 3H13C15.0843 3.11499 17.053 3.99476 18.5291 5.47086C20.0052 6.94696 20.885 8.91565 21 11V11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M4 13V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H18C18.5304 21 19.0391 20.7893 19.4142 20.4142C19.7893 20.0391 20 19.5304 20 19V13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7L12 3L8 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M20.4578 5.50292C19.9691 5.02645 19.3889 4.64848 18.7503 4.39061C18.1117 4.13273 17.4272 4 16.7359 4C16.0446 4 15.3601 4.13273 14.7215 4.39061C14.0829 4.64848 13.5026 5.02645 13.0139 5.50292L11.9997 6.4913L10.9855 5.50292C9.99842 4.54094 8.6596 4.0005 7.26361 4.0005C5.86761 4.0005 4.52879 4.54094 3.54168 5.50292C2.55456 6.46491 2 7.76964 2 9.1301C2 10.4906 2.55456 11.7953 3.54168 12.7573L4.55588 13.7457L11.9997 21L19.4436 13.7457L20.4578 12.7573C20.9467 12.281 21.3346 11.7156 21.5992 11.0932C21.8638 10.4708 22 9.80377 22 9.1301C22 8.45642 21.8638 7.78935 21.5992 7.16699C21.3346 6.54463 20.9467 5.97917 20.4578 5.50292Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M3.5 12C5.7 8.3 8.6 6.4 12 6.4C15.4 6.4 18.3 8.3 20.5 12C18.3 15.7 15.4 17.6 12 17.6C8.6 17.6 5.7 15.7 3.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4L20 20" strokeLinecap="round" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 20V5" strokeLinecap="round" />
      <path
        d="M5 5H17L14.5 9L17 13H5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 18L15 12L9 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <path
        d="M10 18.3332C14.6024 18.3332 18.3333 14.6022 18.3333 9.99984C18.3333 5.39746 14.6024 1.6665 10 1.6665C5.39763 1.6665 1.66667 5.39746 1.66667 9.99984C1.66667 14.6022 5.39763 18.3332 10 18.3332Z"
        stroke="currentColor"
        strokeOpacity="0.88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.6665V13.3332"
        stroke="currentColor"
        strokeOpacity="0.88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66667 10H13.3333"
        stroke="currentColor"
        strokeOpacity="0.88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotificationIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none">
      <path
        d="M14.4446 6.83333C14.4446 5.68406 13.9764 4.58186 13.1429 3.7692C12.3094 2.95655 11.1789 2.5 10.0002 2.5C8.82142 2.5 7.69096 2.95655 6.85747 3.7692C6.02397 4.58186 5.55572 5.68406 5.55572 6.83333C5.55572 11.8889 3.3335 13.3333 3.3335 13.3333H16.6668C16.6668 13.3333 14.4446 11.8889 14.4446 6.83333Z"
        stroke="currentColor"
        strokeOpacity="0.88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 15.8335C12.2459 16.3404 11.8813 16.7612 11.4425 17.0537C11.0038 17.3462 10.5063 17.5002 10 17.5002C9.49367 17.5002 8.99623 17.3462 8.55748 17.0537C8.11872 16.7612 7.75406 16.3404 7.5 15.8335"
        stroke="currentColor"
        strokeOpacity="0.88"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8294 15.4971C12.015 15.127 12.466 14.9776 12.8362 15.1631C13.2062 15.3488 13.3557 15.7997 13.1702 16.1699C12.8623 16.784 12.4137 17.3076 11.8586 17.6777C11.3022 18.0487 10.6608 18.2499 10.0002 18.25C9.3395 18.25 8.69743 18.0488 8.14087 17.6777C7.5858 17.3076 7.1372 16.784 6.82935 16.1699C6.64382 15.7997 6.79328 15.3488 7.16333 15.1631C7.53353 14.9776 7.98447 15.127 8.17017 15.4971C8.37035 15.8965 8.65078 16.2149 8.97291 16.4297C9.29385 16.6437 9.64835 16.75 10.0002 16.75C10.352 16.7499 10.7058 16.6436 11.0266 16.4297C11.3487 16.2149 11.6292 15.8965 11.8294 15.4971ZM13.6946 6.83301C13.6945 5.88916 13.3099 4.98008 12.6194 4.30664C11.928 3.63253 10.986 3.25008 10.0002 3.25C9.01438 3.25 8.07258 3.63246 7.38111 4.30664C6.6904 4.98011 6.306 5.88901 6.30591 6.83301C6.30591 9.47449 5.72375 11.2287 5.09888 12.3457C5.05245 12.4287 5.00473 12.5073 4.95826 12.583H15.0413C14.9948 12.5073 14.9471 12.4287 14.9006 12.3457C14.2758 11.2287 13.6946 9.47449 13.6946 6.83301ZM15.1946 6.83301C15.1946 9.24708 15.724 10.7441 16.2102 11.6133C16.4544 12.0498 16.6926 12.336 16.8577 12.5059C16.9404 12.591 17.0052 12.648 17.0442 12.6797C17.0636 12.6954 17.0767 12.705 17.0823 12.709C17.0835 12.7098 17.0847 12.7106 17.0852 12.7109L17.0813 12.709C17.3554 12.891 17.4797 13.2308 17.386 13.5469C17.2915 13.8652 16.9983 14.083 16.6663 14.083H3.33326C3.0013 14.083 2.70904 13.8651 2.61451 13.5469C2.52118 13.2321 2.64339 12.8935 2.91529 12.7109L2.91724 12.709C2.92275 12.705 2.93606 12.6953 2.95533 12.6797C2.99437 12.648 3.06007 12.591 3.14283 12.5059C3.30794 12.3359 3.54609 12.0498 3.79029 11.6133C4.27653 10.7441 4.80591 9.24708 4.80591 6.83301C4.806 5.47887 5.35736 4.18408 6.33326 3.23242C7.30878 2.28129 8.62864 1.75 10.0002 1.75C11.3717 1.75008 12.6908 2.28136 13.6663 3.23242C14.6423 4.18409 15.1945 5.47879 15.1946 6.83301Z"
        fill="currentColor"
        fillOpacity="0.88"
      />
    </svg>
  );
}

export function MenuRailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 8H18" strokeLinecap="round" />
      <path d="M6 12H18" strokeLinecap="round" />
      <path d="M6 16H18" strokeLinecap="round" />
    </svg>
  );
}

export function BoldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M8 5H13C15.5 5 17 6.4 17 8.7C17 10.4 15.8 11.7 14 12C16.2 12.2 17.5 13.6 17.5 15.8C17.5 18.4 15.8 20 12.8 20H8V5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StrikethroughIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 12H18" strokeLinecap="round" />
      <path d="M15.5 6.5C14.9 5.6 13.7 5 12 5C9.7 5 8 6.2 8 8C8 10.7 11.1 11 12.8 11.4C14.7 11.8 16 12.4 16 14.3C16 16.4 14.1 18 11.4 18C9.2 18 7.5 17.2 6.5 15.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9.5 8C7.6 8.8 6.5 10.5 6.5 12.7V16H11V11H7.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 8C15.6 8.8 14.5 10.5 14.5 12.7V16H19V11H15.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkActionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.5 13.5L13.5 10.5" strokeLinecap="round" />
      <path d="M8.5 15.5L6.8 17.2C5.3 18.7 2.9 18.7 1.4 17.2C-0.1 15.7 -0.1 13.3 1.4 11.8L5 8.2C6.5 6.7 8.9 6.7 10.4 8.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(6 0)" />
      <path d="M13.6 15.8C15.1 17.3 17.5 17.3 19 15.8L22.6 12.2C24.1 10.7 24.1 8.3 22.6 6.8C21.1 5.3 18.7 5.3 17.2 6.8L15.5 8.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-5 0)" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="M5.5 17L10.2 12.5C10.7 12 11.5 12 12 12.4L14.8 14.8C15.3 15.2 16 15.2 16.5 14.8L18.5 13.1C19 12.7 19.7 12.7 20.2 13.1L21 13.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="13" height="14" rx="3" />
      <path d="M16 10L21 7.5V16.5L16 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SpoilerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 12C6 8 8.7 6 12 6C15.3 6 18 8 20 12C18 16 15.3 18 12 18C8.7 18 6 16 4 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 20.5L20.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

export function BulletListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="5" cy="7" r="2" fill="currentColor" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
      <circle cx="5" cy="17" r="2" fill="currentColor" />
      <path d="M9 7H19" strokeLinecap="round" />
      <path d="M9 12H19" strokeLinecap="round" />
      <path d="M9 17H19" strokeLinecap="round" />
    </svg>
  );
}

export function OrderedListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7H6V10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14C4.5 13.3 5.1 13 5.8 13C6.9 13 7.5 13.7 7.5 14.5C7.5 15.1 7.2 15.5 6.6 16L4 18H7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7H20" strokeLinecap="round" />
      <path d="M10 12H20" strokeLinecap="round" />
      <path d="M10 17H20" strokeLinecap="round" />
    </svg>
  );
}

export function ThumbUpOutlineIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M7.75 8.25V16.5H4.75C4.06 16.5 3.5 15.94 3.5 15.25V9.5C3.5 8.81 4.06 8.25 4.75 8.25H7.75Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.25L10.5 3.75C10.84 3.14 11.61 2.9 12.24 3.18C12.89 3.48 13.21 4.22 12.98 4.9L12.08 7.75H15.03C16.07 7.75 16.83 8.74 16.55 9.75L15.15 14.75C14.95 15.47 14.3 15.97 13.55 15.97H8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoreHorizontalIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
      <circle cx="4.5" cy="10" r="1.2" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="15.5" cy="10" r="1.2" />
    </svg>
  );
}

export function SortCommentsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M5 5H15" strokeLinecap="round" />
      <path d="M5 9H12" strokeLinecap="round" />
      <path d="M5 13H9" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDownSmallIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronUpSmallIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 12.5L10 7.5L15 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
