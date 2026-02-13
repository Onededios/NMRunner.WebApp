# NMRunner WebApp

Desktop Electron app for running Newman collections with live progress updates.

## Development

```bash
npm run dev
```

## Run with Electron (after build)

```bash
npm run build
npm run start
```

## Build Windows .exe

```bash
npm run dist:win
```

The installer and unpacked app will be in the `release` folder.

## Collection

The default sample collection is in `public/sample.postman_collection.json`. Enter a custom path in the UI to run another collection.

## Defaults and Logs

- The app saves the last collection path as a default in the user data folder.
- Logs are written to a rolling file in the user data folder: `logs/nmrunner.log`.
