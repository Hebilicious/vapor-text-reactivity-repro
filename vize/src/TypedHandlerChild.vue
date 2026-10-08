<script setup lang="ts" vapor>
const emit = defineEmits<{ ping: [value: string] }>();
</script>

<template>
  <button id="typed-ping" type="button" @click="emit('ping', 'pong')">Ping</button>
</template>
