<script setup lang="ts">
defineProps<{ logs: string[] }>();
</script>

<template>
	<section class="panel logs">
		<h2>Live Logs</h2>
		<div class="log-output">
			<p
				v-if="logs.length === 0"
				class="muted">
				Logs will appear here.
			</p>
			<p
				v-for="(line, index) in logs"
				:key="index"
				class="log-line">
				{{ line }}
			</p>
		</div>
	</section>
</template>
