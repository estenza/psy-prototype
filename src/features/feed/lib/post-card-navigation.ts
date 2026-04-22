export function isInteractivePostCardTarget(
  target: EventTarget | null,
  container?: Element | null,
) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveTarget = target.closest(
    [
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "summary",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[data-interactive='true']",
    ].join(","),
  );

  if (!interactiveTarget) {
    return false;
  }

  return interactiveTarget !== container;
}
