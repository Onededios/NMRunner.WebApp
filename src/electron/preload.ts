import { contextBridge, ipcRenderer } from 'electron';

const onChannel = <T>(channel: string, callback: (payload: T) => void) => {
	const handler = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
	ipcRenderer.on(channel, handler);
	return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('nmrunner', {
	runTests: (payload?: { collectionPath?: string }) => ipcRenderer.invoke('newman:run', payload),
	onLog: (callback: (line: string) => void) => onChannel('newman:log', callback),
	onProgress: (callback: (value: number) => void) => onChannel('newman:progress', callback),
	onDone: (callback: (summary: { total: number; failures: number; durationMs: number }) => void) => onChannel('newman:done', callback),
	onError: (callback: (message: string) => void) => onChannel('newman:error', callback),
	getPrefs: () => ipcRenderer.invoke('prefs:get'),
	setPrefs: (updates: { collectionPath?: string }) => ipcRenderer.invoke('prefs:set', updates),
});
