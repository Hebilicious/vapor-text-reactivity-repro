<script setup lang="ts" vapor>
import { ref } from "vue";

const version = ref(1);
</script>

<template>
  <div>
    <button id="next-version" type="button" @click="version++">Next version</button>
    <p id="keyed" :key="version">Version {{ version }}</p>
  </div>
</template>
