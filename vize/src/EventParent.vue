<script setup lang="ts" vapor>
import { ref } from "vue";
import EventChild from "./EventChild.vue";

const closed = ref(false);
</script>

<template>
  <div>
    <EventChild @close-preset="closed = true" />
    <span id="closed">{{ closed }}</span>
  </div>
</template>
