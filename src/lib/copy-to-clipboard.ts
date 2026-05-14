export async function copyTextToClipboard(text: string) {
  if (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback below.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textArea = document.createElement("textarea");
  const activeElement = document.activeElement;

  textArea.value = text;
  textArea.readOnly = true;
  textArea.setAttribute("aria-hidden", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-91000px";
  textArea.style.top = "0";
  textArea.style.width = "1px";
  textArea.style.height = "1px";
  textArea.style.opacity = "0";
  textArea.style.fontSize = "16px";

  document.body.appendChild(textArea);

  try {
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();

    if (activeElement instanceof HTMLElement) {
      activeElement.focus();
    }
  }
}
