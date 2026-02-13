<script setup lang="ts">
const props = defineProps<{ isRunning: boolean }>();
const emit = defineEmits<{ run: [] }>();

const handleRun = () => {
	if (!props.isRunning) {
		emit('run');
	}
};
</script>

<template>
	<header class="hero">
		<div>
			<p class="eyebrow">NMRunner</p>
			<h1>Newman Desktop Runner</h1>
			<p class="subhead">Run Postman collections with live progress, logs, and results.</p>
		</div>
		<button
			class="primary"
			:disabled="isRunning"
			@click="handleRun">
			{{ isRunning ? 'Running...' : 'Run Tests' }}
		</button>
	</header>
</template>
