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
    <TextField className="w-full">
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={compact ? 1 : 2}
        className={`comment-editor-shell surface-primary border-separator-strong w-full resize-none overflow-hidden rounded-[16px] px-[13px] text-[14px] leading-5 ${compact ? "min-h-5 py-3" : "min-h-[40px] py-[13px]"}`.trim()}
      />
    </TextField>
  );
}
