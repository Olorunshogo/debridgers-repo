# debridgers-mobile

Debridgers field app for buyers and agents, built with Flutter. Not run
through pnpm/Nx's JS toolchain - Nx just shells out to the `flutter` CLI via
`nx:run-commands` (see `project.json`).

## Prerequisites

The Flutter SDK must be installed locally; it is not part of the pnpm
workspace and is not installed by `pnpm install`.

## Commands

Run from the repo root:

```bash
pnpm get:mobile            # flutter pub get
pnpm dev:mobile            # flutter run
pnpm analyze:mobile        # flutter analyze
pnpm test:mobile           # flutter test
pnpm build:mobile:apk      # flutter build apk
pnpm build:mobile:ios      # flutter build ios
```

`API_BASE_URL` is read via `--dart-define` at build/run time
(`lib/core/network/api_client.dart`), the same role `VITE_API_URL` plays for
the web apps - there is no Flutter equivalent of a `.env.*` file, so pass it
explicitly:

```bash
API_BASE_URL=https://api-test.debridgers.com/api/v1 pnpm build:mobile:apk
```
