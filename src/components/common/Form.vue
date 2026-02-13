<script setup lang="ts">
defineProps<{ modelValue: string; disabled: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	emit('update:modelValue', target.value);
};
</script>

<template>
	<section class="panel">
		<label class="field">
			<span>Collection path (optional)</span>
			<input
				:value="modelValue"
				placeholder="Leave blank to use sample collection"
				:disabled="disabled"
				@input="handleInput" />
		</label>
	</section>
</template>
