export function HoverTooltip({ label }: { label: string }) {
  return (
    <span className="tooltip-surface pointer-events-none invisible absolute left-1/2 top-full z-[70] mt-1 -translate-x-1/2 whitespace-nowrap rounded-[5px] px-2 py-1 text-[11px] font-medium leading-none text-[var(--label-inverse)] opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-hover/tooltip:delay-500 group-focus-visible/tooltip:visible group-focus-visible/tooltip:opacity-100 group-focus-visible/tooltip:delay-500">
      {label}
    </span>
  );
}
