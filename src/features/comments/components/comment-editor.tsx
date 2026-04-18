"use client";

import { TextArea, TextField } from "@heroui/react";
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
    <TextField
      aria-label={placeholder}
      className="w-full"
    >
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={2}
        className={`comment-editor-shell type-body-md w-full resize-none overflow-hidden rounded-[16px] px-[13px] pt-3 pb-14 ${compact ? "min-h-[88px]" : "min-h-[96px]"}`.trim()}
      />
    </TextField>
  );
}
