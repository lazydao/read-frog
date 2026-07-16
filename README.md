<p align="center">
  <img src="./assets/branding/transfrog-icon.png" alt="TransFrog" width="144" height="144">
</p>

<h1 align="center">TransFrog</h1>

<p align="center">
  A focused browser extension for translating web pages and YouTube captions with your own models.
</p>

TransFrog is a streamlined fork of [Read Frog](https://github.com/mengxi-ream/read-frog).
It keeps the two translation workflows we care about, removes the surrounding learning-product
suite, and does not require a TransFrog-hosted backend.

## Features

- Full-page translation with bilingual and translation-only display modes.
- YouTube caption translation for videos that already provide captions.
- User-configured AI and translation providers.
- OpenAI-compatible custom endpoints and local/self-hosted models such as Ollama.
- Context-aware translation using page or video metadata.
- Custom prompts, translation styles, site rules, and request controls.
- Local browser configuration with no TransFrog account or cloud service.

## Proudly focused

TransFrog is deliberately smaller than a general language-learning or AI-assistant extension.

| Workflow         | Included                                           | Intentionally excluded                                      |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Web pages        | Full-page translation, bilingual mode, site rules  | Selection tools, floating overlays, input translation       |
| Video            | YouTube caption translation                        | Speech recognition, dubbing, video editing                  |
| Models           | Official providers, custom endpoints, local models | Bundled paid backend or mandatory hosted API                |
| Product surface  | Popup and focused settings                         | Accounts, Notebase, Translation Hub, statistics, onboarding |
| Browser services | Local storage and translation cache                | Telemetry, cloud backup, TTS, side panel                    |

## Privacy and model access

TransFrog has no project-hosted account or translation backend. Translation requests are sent
directly to the provider endpoint configured by the user. API keys and settings remain in the
browser profile. The privacy and retention policy of the selected provider still applies.

## Build and install

Requirements: Node.js 22.22 or newer and Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm package:chrome
```

The package command creates:

- `.output/chrome-mv3` — unpacked Chrome/Edge extension;
- `.output/transfrog-<version>-chrome.zip` — distributable archive.

To install the unpacked build:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3`.

After rebuilding, return to the extensions page and reload TransFrog.

## Development

```bash
pnpm install --frozen-lockfile
pnpm type-check
SKIP_FREE_API=true pnpm test
pnpm build
```

On PowerShell, set `$env:SKIP_FREE_API="true"` before running the test command.

## Project policy

TransFrog does not automatically merge every upstream Read Frog change. Provider, browser
compatibility, security, page-translation, and subtitle fixes should be reviewed and
cherry-picked intentionally. Internal `read-frog-*` storage keys and CSS identifiers are retained
where changing them would break existing local configurations or page rules.

## License and attribution

TransFrog is a modified version of
[Read Frog](https://github.com/mengxi-ream/read-frog). Thanks to the Read Frog authors and
contributors for the original work.

This project is distributed under the GNU General Public License version 3. See
[LICENSE](./LICENSE) for the full license text. TransFrog preserves the GPLv3 terms, keeps the
modified source available under the same license, and clearly identifies itself as an independent
fork so issues in this project are not attributed to the upstream maintainers.
