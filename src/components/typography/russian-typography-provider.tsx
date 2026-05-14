"use client";

import { useEffect } from "react";

const NON_BREAKING_SPACE = "\u00A0";
const CYRILLIC_LETTER_PATTERN = /[А-Яа-яЁё]/;
const SYSTEM_TYPOGRAPHY_SELECTOR = "[data-typography-system]";
const SKIPPED_SELECTOR = [
  "script",
  "style",
  "textarea",
  "input",
  "select",
  "option",
  "pre",
  "code",
  "kbd",
  "samp",
  "svg",
  "canvas",
  "[contenteditable='true']",
  "[data-typography-skip]",
].join(",");

const russianHangingWords = [
  "а",
  "без",
  "бы",
  "в",
  "вам",
  "вас",
  "ведь",
  "во",
  "вот",
  "вы",
  "где",
  "да",
  "для",
  "до",
  "его",
  "ее",
  "её",
  "ей",
  "если",
  "же",
  "за",
  "и",
  "из",
  "или",
  "им",
  "их",
  "к",
  "как",
  "когда",
  "ко",
  "кто",
  "ли",
  "либо",
  "мне",
  "мы",
  "на",
  "над",
  "нам",
  "нас",
  "не",
  "но",
  "о",
  "об",
  "обо",
  "он",
  "от",
  "перед",
  "по",
  "под",
  "при",
  "про",
  "с",
  "со",
  "тебе",
  "то",
  "ты",
  "у",
  "что",
  "чтобы",
  "я",
];

const hangingWordsPattern = new RegExp(
  `(^|[\\s([{«"„“])(${russianHangingWords.join("|")})(\\s+)(?=\\S)`,
  "giu",
);

function shouldSkipTextNode(textNode: Text) {
  const parentElement = textNode.parentElement;

  return (
    !parentElement
    || !parentElement.closest(SYSTEM_TYPOGRAPHY_SELECTOR)
    || Boolean(parentElement.closest(SKIPPED_SELECTOR))
  );
}

function applyRussianTypography(value: string) {
  if (!CYRILLIC_LETTER_PATTERN.test(value)) {
    return value;
  }

  let currentValue = value;
  let nextValue = currentValue;

  do {
    currentValue = nextValue;
    nextValue = currentValue.replace(
      hangingWordsPattern,
      (_match, prefix: string, word: string) => `${prefix}${word}${NON_BREAKING_SPACE}`,
    );
  } while (nextValue !== currentValue);

  return nextValue;
}

function processTextNode(textNode: Text) {
  if (shouldSkipTextNode(textNode)) {
    return;
  }

  const currentValue = textNode.nodeValue;

  if (!currentValue) {
    return;
  }

  const nextValue = applyRussianTypography(currentValue);

  if (nextValue !== currentValue) {
    textNode.nodeValue = nextValue;
  }
}

function processNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node as Text);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;

  if (element.matches(SKIPPED_SELECTOR)) {
    return;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    processTextNode(textNode as Text);
    textNode = walker.nextNode();
  }
}

function processSystemTypography(root: ParentNode = document) {
  if (root instanceof Element && root.closest(SYSTEM_TYPOGRAPHY_SELECTOR)) {
    processNode(root);
    return;
  }

  const systemElements = Array.from(root.querySelectorAll(SYSTEM_TYPOGRAPHY_SELECTOR));

  systemElements.forEach(processNode);
}

export function RussianTypographyProvider() {
  useEffect(() => {
    processSystemTypography();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          processNode(mutation.target);
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processSystemTypography(node as Element);
            continue;
          }

          processNode(node);
        }
      }
    });

    observer.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
