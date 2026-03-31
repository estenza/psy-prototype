import { Node, mergeAttributes } from "@tiptap/core";

type EmbeddedMediaKind = "iframe" | "video";

type ResolvedEmbeddedMedia = {
  kind: EmbeddedMediaKind;
  src: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embeddedMedia: {
      setEmbeddedMedia: (url: string) => ReturnType;
    };
  }
}

function getUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(url: URL) {
  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.replace("/", "");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (url.hostname.includes("youtube.com")) {
    const videoId = url.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  return null;
}

function getVimeoEmbedUrl(url: URL) {
  if (!url.hostname.includes("vimeo.com")) {
    return null;
  }

  const videoId = url.pathname.split("/").filter(Boolean).at(-1);
  return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
}

export function resolveEmbeddedMedia(url: string): ResolvedEmbeddedMedia | null {
  const parsedUrl = getUrl(url);

  if (!parsedUrl) {
    return null;
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(parsedUrl);

  if (youtubeEmbedUrl) {
    return { kind: "iframe", src: youtubeEmbedUrl };
  }

  const vimeoEmbedUrl = getVimeoEmbedUrl(parsedUrl);

  if (vimeoEmbedUrl) {
    return { kind: "iframe", src: vimeoEmbedUrl };
  }

  if (/\.(mp4|webm|ogg)$/i.test(parsedUrl.pathname)) {
    return { kind: "video", src: parsedUrl.toString() };
  }

  return null;
}

export const EmbeddedMedia = Node.create({
  name: "embeddedMedia",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      kind: {
        default: "iframe",
      },
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embedded-media]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind as EmbeddedMediaKind;
    const src = HTMLAttributes.src as string | null;

    if (!src) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-embedded-media": "true" })];
    }

    if (kind === "video") {
      return [
        "div",
        mergeAttributes(HTMLAttributes, {
          "data-embedded-media": "true",
          "data-kind": "video",
        }),
        ["video", { controls: "true", preload: "metadata", src }],
      ];
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-embedded-media": "true",
        "data-kind": "iframe",
      }),
      [
        "iframe",
        {
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
          src,
        },
      ],
    ];
  },

  addCommands() {
    return {
      setEmbeddedMedia:
        (url) =>
        ({ commands }) => {
          const resolvedMedia = resolveEmbeddedMedia(url);

          if (!resolvedMedia) {
            return false;
          }

          return commands.insertContent({
            attrs: resolvedMedia,
            type: this.name,
          });
        },
    };
  },
});
