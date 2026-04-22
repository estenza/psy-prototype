# Emoji Mart Vendor Layer

This directory contains locally vendored pieces adapted from
[`missive/emoji-mart`](https://github.com/missive/emoji-mart).

Current sources used as a base:

- `packages/emoji-mart/src/icons.tsx`
- `packages/emoji-mart/src/helpers/search-index.ts`

Why vendored locally:

- preserve the visual language of Emoji Mart
- avoid the layout and shadow DOM constraints of the packaged picker
- keep the comments picker fully customizable in our app

These files remain subject to the MIT license included in
[LICENSE](/Users/vadimzaripov/vnutri/src/vendor/emoji-mart/LICENSE).
