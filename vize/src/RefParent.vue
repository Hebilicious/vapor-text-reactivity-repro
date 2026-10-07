<script setup lang="ts" vapor>
import { useTemplateRef } from "vue";
import RefChild from "./RefChild.vue";

const child = useTemplateRef<{ greeting: string }>("child");
</script>

<template>
  <div>
    <RefChild ref="child" />
    <span id="ref-state">{{ child?.greeting ?? "null" }}</span>
  </div>
</template>
