export type RunSummary = {
	total: number;
	failures: number;
	durationMs: number;
};

declare global {
	interface Window {
		nmrunner: {
			runTests: (payload?: { collectionPath?: string }) => Promise<void>;
			onLog: (callback: (line: string) => void) => () => void;
			onProgress: (callback: (value: number) => void) => () => void;
			onDone: (callback: (summary: RunSummary) => void) => () => void;
			onError: (callback: (message: string) => void) => () => void;
			getPrefs: () => Promise<{ collectionPath: string }>;
			setPrefs: (updates: { collectionPath?: string }) => Promise<{ collectionPath: string }>;
		};
	}
}
