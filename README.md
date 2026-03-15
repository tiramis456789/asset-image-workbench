# Asset Image Workbench

[Korean README](README.ko.md)

Asset Image Workbench is a browser-based workbench for reviewing, sorting, renaming, and reorganizing image files before committing changes to disk.

It is built for workflows where metadata matters, especially generated-image collections that carry prompt and EXIF-like information. The app keeps changes virtual until the final apply step so you can inspect the result first and write to the real folder last.

## Highlights

- Image viewer with filmstrip and multi-view comparison
- Pinning and pinned-only review flow
- Virtual rename and virtual folder move workflow
- Apply preview before touching real files
- Real apply step with `log.txt` logging
- EXIF inspection and tag-based candidate workflows
- Lego-style template builder for structured file names

## Current Status

- Core rename, move, EXIF, and apply flows are implemented
- Real file apply is available only for folders opened through the writable folder flow
- Desktop packaging is available
- Automated tests cover rename rules, apply behavior, movement rules, tag editing, and EXIF filters

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI / shadcn-style UI components
- Vitest

## Requirements

- Node.js 20 or newer recommended
- A modern Chromium-based browser for writable folder access

The real apply flow depends on the File System Access API. In practice this works best in Chromium-based browsers.

## Install

```sh
npm install
```

## Run

```sh
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```sh
npm run build
```

## Desktop Preview

```sh
npm run desktop:preview
```

This builds the Vite app first and then opens the Electron shell against the local production bundle.

## Portable EXE Build

```sh
npm run build:portable
```

The Windows portable executable is written to:

```text
release/AssetImageWorkbench-<version>-portable.exe
```

This is a no-install portable build intended for local download-and-run distribution.
For this project, the portable build is the recommended distribution format because the app is meant to be used as a lightweight community utility rather than a permanently installed desktop product.

## Test

```sh
npm run test
npm run lint
```

## Typical Workflow

1. Load images or open a writable folder.
2. Review images in the viewer, filmstrip, or multi-view layout.
3. Pin, filter, rename, and move items in the virtual workspace.
4. Inspect pending rename and move changes.
5. Apply to the real folder only when the preview looks correct.

## Real Apply Notes

- Images added as plain files can be reviewed and edited virtually, but real apply requires a writable folder source.
- The app checks for target-file collisions before applying changes.
- Partial failures are logged, and successful updates are kept.
- A `log.txt` file is written to the writable root during apply.

## Scope

This project is aimed at personal and community use rather than a hosted SaaS product. The focus is on practical batch organization for image-heavy workflows, not on server features or account systems.

## Limitations

- Browser support for writable folders is limited
- Some UI copy still needs cleanup
- Generated UI wrapper files still produce existing Fast Refresh lint warnings
- The packaged desktop build currently uses Electron's default app icon

## Packaging And Security Notes

- The recommended release format is the Windows portable executable because this project is intended for occasional local use and low-friction community sharing.
- The Electron desktop build keeps `contextIsolation: true` and `nodeIntegration: false`.
- The Electron renderer sandbox currently remains disabled in packaged builds because enabling `sandbox: true` caused a black-screen regression in portable runtime testing on Windows.
- This is an intentional compatibility trade-off for the current release, not the ideal long-term security posture.
- Any future sandbox hardening should be validated against the packaged executable, not only against local development or static checks.
- The current portable release was checked with VirusTotal before sharing and showed no malicious detections among the engines that completed analysis.
- Some VirusTotal engines returned timeout or unsupported-file-type results, which should be treated as incomplete analysis rather than as positive detections.

## AI Disclosure

This project was developed with assistance from generative AI during implementation and documentation work.
The released code and written materials were reviewed and finalized by a human before sharing.

## Roadmap

- Desktop packaging
- Final UX polish for apply results and failure guidance
- Additional workflow documentation and screenshots

## License

MIT
