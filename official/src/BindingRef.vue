<script setup lang="ts" vapor>
import { onMounted, shallowRef } from "vue";

const field = shallowRef<HTMLInputElement | null>(null);
const seen = shallowRef("pending");
onMounted(() => {
  seen.value = field.value?.tagName ?? "null";
});
</script>

<template>
  <div>
    <input ref="field" id="binding-field" />
    <span id="binding-state">{{ seen }}</span>
  </div>
</template>
