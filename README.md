# Vapor text reactivity: broken under Vitest Browser Mode, fine under plain Vite

A Vue 3.6 Vapor-mode component's reactive text does not update when it is
served through [Vitest Browser Mode](https://vitest.dev/guide/browser/) and
compiled by [`@vizejs/vite-plugin`](https://www.npmjs.com/package/@vizejs/vite-plugin),
but updates correctly in every other combination tested:

| Compiler                                     | Plain `vite dev` / `vite build` | Vitest Browser Mode |
| --------------------------------------------- | :------------------------------: | :------------------: |
| `@vitejs/plugin-vue` (official)               |               ✅ works            |       ✅ works        |
| `@vizejs/vite-plugin` (`vize`, `vapor: true`) |               ✅ works            |     ❌ **broken**     |

This repo is two self-contained, otherwise-identical projects:

- `official/` — `@vitejs/plugin-vue@6.0.7`, Vue's own compiler. Control group.
- `vize/` — `@vizejs/vite-plugin@0.434.0` with `vapor: true`. Reproduces the bug.

Both mount the exact same `src/Counter.vue` (byte-identical,
`<script setup lang="ts" vapor>`) with `createVaporApp` from `@vue/runtime-vapor`,
and both are tested two ways: a real `vite dev` page driven by Playwright, and a
`vitest run --config vitest.browser.config.ts` test using
`@vitest/browser-playwright`.

## The component

```vue
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
```

Clicking the button sets `count.value = 6`. Both `#pure` and `#mixed` should
then read `6` / `Count is 6`.

## Reproduce

```sh
cd vize
pnpm install
pnpm approve-builds --all   # approves esbuild's postinstall

# Works: plain Vite dev server, driven by hand or Playwright.
pnpm dev   # open http://localhost:5173, click Bump, text updates correctly

# Broken: the identical component through Vitest Browser Mode.
pnpm exec vitest run --config vitest.browser.config.ts
```

The Vitest run fails:

```
AssertionError: expected '1' to be '6' // Object.is equality
Expected: "6"
Received: "1"
```

`count.value` *does* become `6` — the click handler runs and the ref updates —
but `setText`'s corresponding DOM write is never observed by the test, as if
the `renderEffect` wiring the Vapor compiler generated for these two `<span>`s
never re-ran, or re-ran against detached nodes.

For comparison, run the identical check in `official/`: it passes in both
`pnpm dev` and `pnpm exec vitest run --config vitest.browser.config.ts`,
confirming this is not a `@vue/runtime-vapor` or Vitest Browser Mode problem in
general — only `@vizejs/vite-plugin`'s Vapor output breaks, and only under
Vitest Browser Mode.

## Versions

- Node 24.17.0, Linux x86_64 (WSL2)
- `vue` / `@vue/runtime-vapor`: `3.6.0-rc.10`
- `vize` side: `@vizejs/vite-plugin@0.434.0`, `vite@8.3.2`
- `official` side: `@vitejs/plugin-vue@6.0.7`, `vite@7.3.6`
- `vitest@4.1.11`, `@vitest/browser-playwright@4.1.11`, `playwright-core@1.63.0`

## Origin

Found while adopting Vapor mode in a larger application. The same text-update
failure first appeared in that app's real Vitest Browser Mode suite; this repo
strips it down to the smallest reproduction, isolates it to
`@vizejs/vite-plugin` specifically (not `@vue/runtime-vapor`, not Vitest Browser
Mode in general), and rules out the application's own code as the cause.
