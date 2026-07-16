# Read Frog Core

Read Frog Core is a focused fork of [Read Frog](https://github.com/mengxi-ream/read-frog).
It keeps the two translation workflows we use:

- full-page web translation, including bilingual and translation-only modes;
- YouTube subtitle translation for videos with available captions.

The extension continues to support user-configured AI and translation providers, including
OpenAI-compatible custom endpoints and local/self-hosted models.

## Scope

The fork intentionally excludes the broader language-learning product surface:

- hosted accounts, Notebase, flashcards, and cloud configuration sync;
- text-to-speech and input translation;
- selection actions, floating overlays, context-menu tools, and side panels;
- translation hub, statistics, blog notifications, onboarding, and telemetry.

Legacy configuration fields are retained during the first cleanup phase so existing local
configurations remain readable. Dead schemas and dependencies will be removed in follow-up
iterations after the core page and subtitle workflows are stable.

## Development

```bash
pnpm install
pnpm type-check
SKIP_FREE_API=true pnpm test
pnpm build
```

On PowerShell, use `$env:SKIP_FREE_API="true"` before running tests.

## Upstream policy

This fork does not merge every upstream change. Relevant provider, browser compatibility,
security, page translation, and subtitle fixes should be cherry-picked intentionally.

## License and attribution

Read Frog Core is a modified version of Read Frog and remains licensed under GPL-3.0.
The original project and its contributors retain attribution for their work.
