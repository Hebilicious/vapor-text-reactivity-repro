<script setup lang="ts" vapor>
import { ref } from "vue";

const count = ref(1);
function bump(): void {
  count.value = 6;
}
</script>

<template>
  <button id="bump" type="button" @click="bump">Bump</button>
  <span id="pure">{{ count }}</span>
  <span id="mixed">Count is {{ count }}</span>
</template>
