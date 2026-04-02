"use client";

import { useEffect, useRef } from "react";

type CommentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
};

export function CommentEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  compact = false,
  autoFocus = false,
}: CommentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textareaElement = textareaRef.current;

    if (!textareaElement) {
      return;
    }

    textareaElement.style.height = "0px";
    textareaElement.style.height = `${textareaElement.scrollHeight}px`;
  }, [value]);

  return (
    <div
      className={`comment-editor-shell surface-primary border-separator-strong w-full rounded-[16px] border px-[13px] ${compact ? "py-3" : "py-[13px]"}`.trim()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={compact ? 1 : 2}
        className={`text-label-primary placeholder:text-label-quaternary w-full resize-none overflow-hidden bg-transparent text-[14px] leading-5 outline-none ${compact ? "min-h-5" : "min-h-[40px]"}`.trim()}
      />
    </div>
  );
}
