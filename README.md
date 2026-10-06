# vize Vapor output: minimal reproductions

Two problems in the Vue 3.6 Vapor-mode output of
[`@vizejs/vite-plugin`](https://www.npmjs.com/package/@vizejs/vite-plugin), each
reproduced next to Vue's own compiler compiling the same component:

1. [Reactive text does not update under Vitest Browser Mode](#1-reactive-text-does-not-update-under-vitest-browser-mode)
2. [SVG: `v-if` branches and dynamic `:class`/`:style` are broken](#2-svg-v-if-branches-and-dynamic-classstyle-are-broken)

The repo holds two self-contained, otherwise-identical projects:

- `official/`: `@vitejs/plugin-vue@6.0.7`, Vue's own compiler. Control group.
- `vize/`: `@vizejs/vite-plugin@0.434.0` with `vapor: true`. Reproduces both problems.

Every component is byte-identical on both sides, uses `<script setup lang="ts" vapor>`,
and is mounted with `createVaporApp` from `@vue/runtime-vapor`.

```sh
cd vize            # or: cd official
pnpm install
pnpm approve-builds --all   # approves esbuild's postinstall
pnpm dev                    # http://localhost:5173 renders both components
```

## 1. Reactive text does not update under Vitest Browser Mode

| Compiler                                      | Plain `vite dev` / `vite build` | Vitest Browser Mode |
| --------------------------------------------- | :-----------------------------: | :-----------------: |
| `@vitejs/plugin-vue` (official)               |             ✅ works            |       ✅ works      |
| `@vizejs/vite-plugin` (`vize`, `vapor: true`) |             ✅ works            |    ❌ **broken**    |

`src/Counter.vue`:

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

Clicking the button sets `count.value = 6`, so `#pure` and `#mixed` should read
`6` and `Count is 6`. Under `pnpm dev` they do. Under Vitest Browser Mode they
keep their first values:

```sh
pnpm exec vitest run --config vitest.browser.config.ts src/counter.browser.test.ts
```

```
AssertionError: expected '1' to be '6' // Object.is equality
```

`count.value` does become `6`: the click handler runs and the ref updates, but
the effect that writes the text never reruns.

### Cause and workaround

Vitest Browser Mode's dependency optimizer pre-bundles `@vue/runtime-vapor`
separately from the copy `@vizejs/vite-plugin`'s compiled output imports, so the
page ends up with two module instances. The Vapor `renderEffect` tracks
reactivity through one copy's effect scheduler while `ref()` updates run through
the other's.

`vize/vitest.browser.workaround.config.ts` is identical to
`vize/vitest.browser.config.ts` plus:

```ts
optimizeDeps: {
  exclude: ["@vue/runtime-vapor"],
},
```

```sh
pnpm exec vitest run --config vitest.browser.workaround.config.ts src/counter.browser.test.ts  # passes
```

Same result under `vitest@4.1.11` and `vitest@5.0.3`. No `resolve.dedupe` entry
was needed. The official side needs no exclude.

## 2. SVG: `v-if` branches and dynamic `:class`/`:style` are broken

| Check (on `vapor` output)                            | Official | vize |
| ---------------------------------------------------- | :------: | :--: |
| `v-if` branch inside `<svg>` is an SVG element       |    ✅    |  ❌  |
| `:class` on an `<svg>` element is normalized         |    ✅    |  ❌  |
| `:style` on an `<svg>` element is applied            |    ✅    |  ❌  |

`src/SvgIcon.vue`:

```vue
<script setup lang="ts" vapor>
import { computed } from "vue";

const props = defineProps<{ tier: number }>();
const color = computed(() => (props.tier === 1 ? "rgb(200, 0, 0)" : "rgb(0, 0, 200)"));
</script>

<template>
  <svg id="icon" class="icon" :class="`tier-${tier}`" :style="{ color }" viewBox="0 0 64 64" width="64" height="64">
    <g v-if="tier === 1" id="mark-1"><circle cx="32" cy="32" r="16" fill="currentColor" /></g>
    <g v-else id="mark-other"><rect x="16" y="16" width="32" height="32" fill="currentColor" /></g>
  </svg>
</template>
```

`pnpm dev` draws a red circle under the counter on the official side and nothing
on the vize side. The checks, which fail on vize under both Vitest configs:

```sh
pnpm exec vitest run --config vitest.browser.config.ts src/svg-icon.browser.test.ts
```

```
AssertionError: expected 'http://www.w3.org/1999/xhtml' to be 'http://www.w3.org/2000/svg'
AssertionError: expected 'icon,tier-1' to be 'icon tier-1'
AssertionError: expected '[object Object]' not to contain '[object Object]'
```

### Compiled output

Official (`@vitejs/plugin-vue`):

```js
const t0 = _template("<g id=mark-1><circle cx=32 cy=32 r=16 fill=currentColor>", 2, 1);
const t1 = _template("<g id=mark-other><rect x=16 y=16 width=32 height=32 fill=currentColor>", 2, 1);
const t2 = _template('<svg id=icon viewBox="0 0 64 64" width=64 height=64>', 1, 1);
_setClass(n5, ["icon", `tier-${$props.tier}`], true);
_setStyle(n5, { color: _ctx.color });
```

vize:

```js
const t0 = _template("<g id=\"mark-1\"><circle cx=\"32\" cy=\"32\" r=\"16\" fill=\"currentColor\"></circle></g>", true);
const t1 = _template("<g id=\"mark-other\"><rect x=\"16\" y=\"16\" width=\"32\" height=\"32\" fill=\"currentColor\"></rect></g>", true);
const t2 = _template("<svg id=\"icon\" viewBox=\"0 0 64 64\" width=\"64\" height=\"64\"></svg>", true, 1);
_setAttr(n0, "class", ["icon", `tier-${$props.tier}`]);
_setAttr(n0, "style", { color: _ctx.color });
```

- `template(html, flags, ns)` in `@vue/runtime-vapor` parses `html` inside an
  `<svg>` wrapper only when `ns === 1`. vize passes the namespace for the root
  `<svg>` template but omits it for the `v-if` branch templates, so each `<g>`
  is parsed as an HTML element and never renders inside the SVG.
- vize compiles dynamic `class` and `style` on SVG elements to `setAttr`, which
  writes the raw value: an array becomes `"icon,tier-1"` and an object becomes
  `"[object Object]"`. On HTML elements vize emits `setClass` and `setStyle`
  correctly; only SVG elements are affected.

## Versions

- Node 24.17.0, Linux x86_64 (WSL2)
- `vue` / `@vue/runtime-vapor`: `3.6.0-rc.10`
- `vize` side: `@vizejs/vite-plugin@0.434.0`, `vite@8.3.2`
- `official` side: `@vitejs/plugin-vue@6.0.7`, `vite@7.3.6`
- `vitest@4.1.11`, `@vitest/browser-playwright@4.1.11`, `playwright-core@1.63.0`
