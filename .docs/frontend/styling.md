---
title: Frontend Styling
description: Durable notes for shared styling and theme setup in src/app/globals.css.
updateAt: 2026-03-29
---

# Scope

- Covers shared styling entry points and theme tokens in [`src/app/globals.css`](../../src/app/globals.css).
- Applies to layout-level font setup from [`src/app/layout.tsx`](../../src/app/layout.tsx) when that setup affects global styling behavior.

# Current Subdomain Docs

- Global styles begin with `@import "tailwindcss"` in [`src/app/globals.css`](../../src/app/globals.css), so Tailwind CSS v4 is wired in through CSS import rather than a legacy config file.
- Shared color tokens are defined as `--background` and `--foreground` on `:root`, with dark-mode values switched through `prefers-color-scheme`.
- The `@theme inline` block maps shared CSS variables to Tailwind theme tokens, including `--font-sans` and `--font-mono` from the root layout font variables.
- [`src/app/layout.tsx`](../../src/app/layout.tsx) exposes Geist font variables on `<html>`, but [`src/app/globals.css`](../../src/app/globals.css) currently sets `body { font-family: Arial, Helvetica, sans-serif; }`; that means global body text does not automatically inherit Geist unless a utility class or CSS change overrides it.
- The homepage currently mixes global tokens with utility classes like `bg-zinc-50`, `dark:bg-black`, and `bg-foreground`, so future design work should decide whether colors should stay utility-driven or move into project-specific theme tokens.

# Update Triggers

- Update this file when global color tokens, font wiring, or dark-mode behavior changes.
- Update this file when the project adopts a more opinionated design system or shared component styling strategy.
- Update this file when additional styling entry points outside `src/app/globals.css` become part of the stable frontend architecture.
