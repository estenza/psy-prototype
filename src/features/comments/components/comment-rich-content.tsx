"use client";

type CommentRichContentProps = {
  html: string;
  clamped?: boolean;
};

export function CommentRichContent({
  html,
  clamped = false,
}: CommentRichContentProps) {
  return (
    <div
      className="comment-rich-content text-label-primary w-full text-[14px] leading-5"
      data-clamped={clamped ? "true" : "false"}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}
