<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import RunnerHeader from '../components/common/Header.vue';
import RunnerForm from '../components/common/Form.vue';
import RunnerStatus from '../components/common/Status.vue';
import RunnerLogs from '../components/common/Logs.vue';

type RunSummary = {
	total: number;
	failures: number;
	durationMs: number;
};

const isRunning = ref(false);
const progress = ref(0);
const logs = ref<string[]>([]);
const error = ref<string | null>(null);
const summary = ref<RunSummary | null>(null);
const collectionPath = ref('');

const appendLog = (line: string) => {
	logs.value = [...logs.value, line].slice(-500);
};

const resetState = () => {
	error.value = null;
	summary.value = null;
	progress.value = 0;
	logs.value = [];
};

const runTests = async () => {
	if (!window.nmrunner || isRunning.value) {
		return;
	}

	resetState();
	isRunning.value = true;
	await window.nmrunner.runTests({
		collectionPath: collectionPath.value.trim() || undefined,
	});
};

const disposers: Array<() => void> = [];

onMounted(() => {
	if (!window.nmrunner) {
		error.value = 'Electron bridge not available.';
		return;
	}

	window.nmrunner
		.getPrefs()
		.then((saved) => {
			collectionPath.value = saved.collectionPath ?? '';
		})
		.catch(() => {
			// Ignore preference load errors.
		});

	disposers.push(window.nmrunner.onLog(appendLog));
	disposers.push(
		window.nmrunner.onProgress((value) => {
			progress.value = value;
		}),
	);
	disposers.push(
		window.nmrunner.onDone((result) => {
			summary.value = result;
			isRunning.value = false;
		}),
	);
	disposers.push(
		window.nmrunner.onError((message) => {
			error.value = message;
			isRunning.value = false;
		}),
	);
});

onUnmounted(() => {
	for (const dispose of disposers) {
		dispose();
	}
});

watch(collectionPath, (value) => {
	if (!window.nmrunner) {
		return;
	}

	window.nmrunner.setPrefs({ collectionPath: value }).catch(() => {
		// Ignore preference save errors.
	});
});
</script>

<template>
	<RunnerHeader
		:is-running="isRunning"
		@run="runTests" />
	<RunnerForm
		v-model="collectionPath"
		:disabled="isRunning" />
	<RunnerStatus
		:progress="progress"
		:summary="summary"
		:error="error" />
	<RunnerLogs :logs="logs" />
</template>
