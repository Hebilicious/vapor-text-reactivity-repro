<script setup lang="ts" vapor>
const emit = defineEmits<{ closePreset: [] }>();
</script>

<template>
  <button id="close-preset" type="button" @click="emit('closePreset')">Close preset</button>
</template>
