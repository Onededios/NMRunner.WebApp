import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import newman from 'newman';

type RunPayload = {
	collectionPath?: string;
};

type RunSummary = {
	total: number;
	failures: number;
	durationMs: number;
};

type UserPrefs = {
	collectionPath: string;
};

let mainWindow: BrowserWindow | null = null;
let isRunning = false;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPrefs: UserPrefs = { collectionPath: '' };
let prefs: UserPrefs = { ...defaultPrefs };

const SAMPLE_COLLECTION = 'sample.postman_collection.json';

const configPath = () => path.join(app.getPath('userData'), 'config.json');
const logsDir = () => path.join(app.getPath('userData'), 'logs');
const logFilePath = () => path.join(logsDir(), 'nmrunner.log');

const loadPrefs = async () => {
	try {
		const raw = await fs.readFile(configPath(), 'utf8');
		const data = JSON.parse(raw) as Partial<UserPrefs>;
		prefs = { ...defaultPrefs, ...data };
	} catch {
		prefs = { ...defaultPrefs };
	}
};

const savePrefs = async (next: UserPrefs) => {
	prefs = next;
	await fs.mkdir(path.dirname(configPath()), { recursive: true });
	await fs.writeFile(configPath(), JSON.stringify(prefs, null, 2), 'utf8');
};

const writeLog = async (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
	try {
		await fs.mkdir(logsDir(), { recursive: true });
		const timestamp = new Date().toISOString();
		const line = `[${timestamp}] [${level}] ${message}\n`;
		await fs.appendFile(logFilePath(), line, 'utf8');
	} catch {
		// Ignore file logging errors.
	}
};

const resolveCollectionPath = async (input?: string): Promise<string> => {
	const candidates: string[] = [];
	const appPath = app.getAppPath();

	if (input && input.trim().length > 0) {
		const trimmed = input.trim();
		if (path.isAbsolute(trimmed)) {
			candidates.push(trimmed);
		} else {
			candidates.push(path.join(appPath, trimmed));
			candidates.push(path.join(process.cwd(), trimmed));
		}
	} else {
		candidates.push(path.join(appPath, SAMPLE_COLLECTION));
		candidates.push(path.join(appPath, 'public', SAMPLE_COLLECTION));
		candidates.push(path.join(appPath, 'src', 'collections', SAMPLE_COLLECTION));
		candidates.push(path.join(process.cwd(), 'public', SAMPLE_COLLECTION));
		candidates.push(path.join(process.resourcesPath, SAMPLE_COLLECTION));
	}

	for (const candidate of candidates) {
		try {
			await fs.access(candidate);
			return candidate;
		} catch {
			// Try next candidate.
		}
	}

	throw new Error('Collection file not found. Provide a valid path.');
};

const countRequests = (collection: any): number => {
	const walk = (items: any[]): number => {
		let count = 0;
		for (const item of items ?? []) {
			if (item?.request) {
				count += 1;
			}
			if (Array.isArray(item?.item)) {
				count += walk(item.item);
			}
		}
		return count;
	};

	return walk(collection?.item ?? []);
};

const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 760,
		autoHideMenuBar: true,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			preload: path.join(__dirname, 'preload.js'),
		},
	});

	const devServerUrl = process.env.VITE_DEV_SERVER_URL;
	if (devServerUrl) {
		mainWindow.loadURL(devServerUrl);
		mainWindow.webContents.openDevTools({ mode: 'detach' });
	} else {
		mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
	}
};

app.whenReady().then(() => {
	loadPrefs().then(() => {
		createWindow();
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

ipcMain.handle('newman:run', async (event, payload: RunPayload) => {
	if (isRunning) {
		event.sender.send('newman:error', 'A run is already in progress.');
		return;
	}

	isRunning = true;
	event.sender.send('newman:progress', 0);
	event.sender.send('newman:log', 'Starting Newman run...');
	void writeLog('INFO', 'Starting Newman run.');

	let collection: any;
	let collectionSource = '';

	try {
		collectionSource = await resolveCollectionPath(payload?.collectionPath);
		const raw = await fs.readFile(collectionSource, 'utf8');
		collection = JSON.parse(raw);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load collection.';
		event.sender.send('newman:error', message);
		void writeLog('ERROR', message);
		isRunning = false;
		return;
	}

	const totalRequests = countRequests(collection);
	let completedRequests = 0;

	event.sender.send('newman:log', `Using collection: ${collectionSource}`);
	void writeLog('INFO', `Using collection: ${collectionSource}`);

	const runner = newman.run(
		{
			collection,
			reporters: ['cli'],
		},
		(err: Error | null, summary: any) => {
			if (err) {
				event.sender.send('newman:error', err.message);
				void writeLog('ERROR', err.message);
			}

			const failures = summary?.run?.failures?.length ?? 0;
			const total = summary?.run?.stats?.requests?.total ?? totalRequests;
			const started = summary?.run?.timings?.started ?? 0;
			const completed = summary?.run?.timings?.completed ?? started;

			const result: RunSummary = {
				total,
				failures,
				durationMs: Math.max(0, completed - started),
			};

			event.sender.send('newman:done', result);
			event.sender.send('newman:progress', 100);
			void writeLog('INFO', `Run completed. Requests=${total} Failures=${failures} DurationMs=${result.durationMs}`);
			isRunning = false;
		},
	);

	runner.on('request', (err: Error | null, args: any) => {
		if (err) {
			event.sender.send('newman:error', err.message);
			void writeLog('ERROR', err.message);
			return;
		}

		completedRequests += 1;
		const label = args?.item?.name ?? 'Request';
		event.sender.send('newman:log', `Request: ${label}`);
		void writeLog('INFO', `Request: ${label}`);

		if (totalRequests > 0) {
			const pct = Math.min(100, (completedRequests / totalRequests) * 100);
			event.sender.send('newman:progress', pct);
		}
	});

	runner.on('assertion', (err: Error | null, args: any) => {
		if (err) {
			const assertion = args?.assertion ?? 'Assertion failed';
			event.sender.send('newman:log', `Assertion error: ${assertion}`);
			void writeLog('WARN', `Assertion error: ${assertion}`);
		}
	});
});

ipcMain.handle('prefs:get', async () => prefs);
ipcMain.handle('prefs:set', async (_event, updates: Partial<UserPrefs>) => {
	const next: UserPrefs = {
		...prefs,
		collectionPath: updates.collectionPath ?? prefs.collectionPath ?? '',
	};
	await savePrefs(next);
	return next;
});
