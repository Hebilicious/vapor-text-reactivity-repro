<script setup lang="ts" vapor>
import { shallowRef } from "vue";
import TypedHandlerChild from "./TypedHandlerChild.vue";

const received = shallowRef("none");
</script>

<template>
  <div>
    <TypedHandlerChild @ping="(value: string) => (received = value)" />
    <span id="typed-received">{{ received }}</span>
  </div>
</template>
