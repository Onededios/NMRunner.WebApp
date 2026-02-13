<script setup lang="ts">
import { computed } from 'vue';

type RunSummary = {
	total: number;
	failures: number;
	durationMs: number;
};

const props = defineProps<{ progress: number; summary: RunSummary | null; error: string | null }>();

const progressLabel = computed(() => `${props.progress.toFixed(0)}%`);
</script>

<template>
	<section class="status">
		<div class="progress">
			<div
				class="progress-bar"
				:style="{ width: progress + '%' }"></div>
		</div>
		<div class="status-meta">
			<span>Progress: {{ progressLabel }}</span>
			<span v-if="summary">Requests: {{ summary.total }} | Failures: {{ summary.failures }}</span>
			<span v-if="summary">Duration: {{ (summary.durationMs / 1000).toFixed(2) }}s</span>
		</div>
		<p
			v-if="error"
			class="error">
			{{ error }}
		</p>
	</section>
</template>
