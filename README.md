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

### macOS: Dia and Safari

Build both macOS browser packages with:

```bash
pnpm package:macos
```

For Dia, open `chrome://extensions`, enable developer mode, choose **Load unpacked**, and select
`.output/chrome-mv3`. Dia uses the same Manifest V3 package as Chrome.

For a temporary Safari installation without Xcode:

1. Open Safari Settings, enable **Show features for web developers** under **Advanced**.
2. Under **Developer**, enable **Allow unsigned extensions**.
3. Click **Add Temporary Extension** and select `.output/transfrog-<version>-safari.zip`.

If Safari reports that an app or service is interfering with clicking, quit apps that use
Accessibility or Screen Recording permissions before trying again. `Typeless` triggered this
protection during our macOS test. After the extension is added, those apps can be reopened. See
[Apple's troubleshooting guidance](https://support.apple.com/en-us/108379) for the underlying
Safari security feature.

Safari removes a temporary extension after 24 hours or when Safari quits. To generate a native
macOS container for regular use, install the full Xcode application and run:

```bash
pnpm generate:safari:project
```

This creates an Xcode project under `.output/safari-xcode` and prints its exact path. Open the
project in Xcode, select a development team when available, then build and run the `TransFrog`
macOS scheme once. Enable TransFrog under Safari Settings > Extensions and grant access to the
websites you want to translate.

### GitHub Actions packaging

The `Package browser extensions` workflow provides a manual, artifact-only build:

1. Enable GitHub Actions for the repository.
2. Open **Actions** > **Package browser extensions**.
3. Choose **Run workflow** and select the branch to package.
4. Download the `transfrog-browser-packages-<run number>` artifact.

The artifact contains Chrome/Dia, Edge, Firefox, and Safari ZIP packages, plus the Firefox source
archive. The workflow has read-only repository permissions, does not run automatically on pushes,
and does not publish a GitHub Release. It also does not produce a signed Safari app; native Safari
distribution still requires Xcode and an Apple signing identity.

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
