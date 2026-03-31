"use client";

import { createElement } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const HYVOR_TALK_WEBSITE_ID = "15244";
const HYVOR_TALK_EMBED_SRC = "https://talk.hyvor.com/embed/embed.js";

type HyvorTalkCommentsProps = {
  pageId: string;
  className?: string;
};

export function HyvorTalkComments({
  pageId,
  className = "",
}: HyvorTalkCommentsProps) {
  const pathname = usePathname();
  const resolvedPageId =
    pageId.trim() || pathname || "discussion:current-page";

  return (
    <div className={className}>
      <Script
        id="hyvor-talk-embed"
        src={HYVOR_TALK_EMBED_SRC}
        type="module"
        strategy="afterInteractive"
      />
      {createElement("hyvor-talk-comments", {
        key: resolvedPageId,
        "website-id": HYVOR_TALK_WEBSITE_ID,
        "page-id": resolvedPageId,
      })}
    </div>
  );
}
