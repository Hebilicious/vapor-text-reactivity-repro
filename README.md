# vize Vapor output: minimal reproductions

Eight problems in the Vue 3.6 Vapor-mode output of
[`@vizejs/vite-plugin`](https://www.npmjs.com/package/@vizejs/vite-plugin), each
reproduced next to Vue's own compiler compiling the same component. Each one has
an issue and a merged fix in the fork
[Hebilicious/vize](https://github.com/Hebilicious/vize), on its `vapor-fixes` branch:
Vize 0.435.0 with the eight fixes and nothing else.

| # | Problem | Fork issue | Fix |
| - | ------- | ---------- | --- |
| 1 | [Reactive text does not update under Vitest Browser Mode](#1-reactive-text-does-not-update-under-vitest-browser-mode) | [#1](https://github.com/Hebilicious/vize/issues/1) | [#2](https://github.com/Hebilicious/vize/pull/2) |
| 2 | [SVG: `v-if` branches and dynamic `:class`/`:style` are broken](#2-svg-v-if-branches-and-dynamic-classstyle-are-broken) | [#3](https://github.com/Hebilicious/vize/issues/3) | [#4](https://github.com/Hebilicious/vize/pull/4) |
| 3 | [A kebab-case component listener never receives its event](#3-a-kebab-case-component-listener-never-receives-its-event) | [#5](https://github.com/Hebilicious/vize/issues/5) | [#6](https://github.com/Hebilicious/vize/pull/6) |
| 4 | [`ref` on a child component never fills the template ref](#4-ref-on-a-child-component-never-fills-the-template-ref) | [#7](https://github.com/Hebilicious/vize/issues/7) | [#8](https://github.com/Hebilicious/vize/pull/8) |
| 5 | [A nested component receives its owner's fallthrough attributes](#5-a-nested-component-receives-its-owners-fallthrough-attributes) | [#9](https://github.com/Hebilicious/vize/issues/9) | [#10](https://github.com/Hebilicious/vize/pull/10) |
| 6 | [`:key` outside `v-for` is dropped](#6-key-outside-v-for-is-dropped) | [#11](https://github.com/Hebilicious/vize/issues/11) | [#12](https://github.com/Hebilicious/vize/pull/12) |
| 7 | [A renamed or nested slot-prop destructure reads the wrong key](#7-a-renamed-or-nested-slot-prop-destructure-reads-the-wrong-key) | [#13](https://github.com/Hebilicious/vize/issues/13) | [#14](https://github.com/Hebilicious/vize/pull/14) |
| 8 | [A template ref never fills the `ref` binding it names](#8-a-template-ref-never-fills-the-ref-binding-it-names) | [#15](https://github.com/Hebilicious/vize/issues/15) | [#16](https://github.com/Hebilicious/vize/pull/16) |

The repo holds two self-contained, otherwise-identical projects:

- `official/`: `@vitejs/plugin-vue@6.0.7`, Vue's own compiler. Control group.
- `vize/`: `@vizejs/vite-plugin@0.434.0` with `vapor: true`. Reproduces every problem.

Every component is byte-identical on both sides, uses `<script setup lang="ts" vapor>`,
and is mounted with `createVaporApp` from `@vue/runtime-vapor`.

```sh
cd vize            # or: cd official
pnpm install
pnpm approve-builds --all   # approves esbuild's postinstall
pnpm dev                    # http://localhost:5173 renders both components
```

## 1. Reactive text does not update under Vitest Browser Mode

Fork: issue [Hebilicious/vize#1](https://github.com/Hebilicious/vize/issues/1), fixed by [#2](https://github.com/Hebilicious/vize/pull/2).

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

`@vizejs/vite-plugin` pins a `.vue` file's `vue` import to the raw
`vue.runtime.esm-bundler.js` unless the importer's `vue` already resolves to a
pre-bundled dependency. Its `isOptimizedVueDependency` check only recognises
`/node_modules/.vite/deps/vue.`, but Vitest pre-bundles into
`node_modules/.vite/vitest/<hash>/deps/`. Under Vitest the check therefore
fails. Compiled components then load the raw runtime while the test file loads
the pre-bundled one, so the page ends up with two `@vue/runtime-vapor`
instances. The Vapor `renderEffect` tracks reactivity through one copy's effect
scheduler while `ref()` updates run through the other's.

A fix compares the resolved path against Vite's `config.cacheDir` instead of the
hard-coded `.vite/deps` segment.

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

Fork: issue [Hebilicious/vize#3](https://github.com/Hebilicious/vize/issues/3), fixed by [#4](https://github.com/Hebilicious/vize/pull/4).

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

## 3 to 8. Components

`src/components.browser.test.ts` checks the six problems below. Problem 1 also
breaks text updates under Vitest, so run the vize side with the workaround
config to see each problem on its own:

```sh
pnpm exec vitest run --config vitest.browser.config.ts src/components.browser.test.ts             # official: 6 passed
pnpm exec vitest run --config vitest.browser.workaround.config.ts src/components.browser.test.ts  # vize: 6 failed
```

| Check                                                        | Official | vize |
| ------------------------------------------------------------ | :------: | :--: |
| 3. `@close-preset` receives `emit("closePreset")`             |    ✅    |  ❌  |
| 4. `ref="child"` on a component fills `useTemplateRef`        |    ✅    |  ❌  |
| 5. A component nested in the root element gets no fallthrough |    ✅    |  ❌  |
| 6. A new `:key` replaces the keyed element                    |    ✅    |  ❌  |
| 7. `v-slot="{ props: trigger }"` reads the `props` slot prop  |    ✅    |  ❌  |
| 8. `ref="field"` fills `const field = shallowRef(null)`        |    ✅    |  ❌  |

## 3. A kebab-case component listener never receives its event

Fork: issue [Hebilicious/vize#5](https://github.com/Hebilicious/vize/issues/5), fixed by [#6](https://github.com/Hebilicious/vize/pull/6).

`src/EventParent.vue` listens with `<EventChild @close-preset="closed = true" />`,
and `src/EventChild.vue` calls `emit("closePreset")`. Clicking the child's
button leaves `#closed` at `false`:

```
AssertionError: expected 'false' to be 'true' // Object.is equality
```

Vapor's `emit` looks up the camelCase handler key. Vue's compiler camelizes the
listener; vize keeps the kebab-case name:

```js
// official
const n0 = _createComponent(EventChild, { onClosePreset: () => _on_close_preset })
// vize
const n0 = _createComponentWithFallback(_component_EventChild, { "onClose-preset": () => (($event) => _ctx.closed = true) }, null, true);
```

## 4. `ref` on a child component never fills the template ref

Fork: issue [Hebilicious/vize#7](https://github.com/Hebilicious/vize/issues/7), fixed by [#8](https://github.com/Hebilicious/vize/pull/8).

`src/RefParent.vue` renders `<RefChild ref="child" />` and reads
`useTemplateRef("child")`. `#ref-state` stays `null`:

```
AssertionError: expected 'null' to be 'hello' // Object.is equality
```

Vue's compiler registers the template ref; vize passes `ref` as a prop:

```js
// official
const n0 = _createComponent(RefChild)
_setStaticTemplateRef(n0, child, null, "child")
// vize
const n0 = _createComponentWithFallback(_component_RefChild, { ref: () => "child" }, null, true);
```

## 5. A nested component receives its owner's fallthrough attributes

Fork: issue [Hebilicious/vize#9](https://github.com/Hebilicious/vize/issues/9), fixed by [#10](https://github.com/Hebilicious/vize/pull/10).

`src/FallthroughOuter.vue` renders `<section id="outer"><FallthroughInner /></section>`
and is mounted with `{ "data-owner": "outer" }`. The attribute belongs on
`#outer` only, but `#inner` gets it too:

```
AssertionError: expected true to be false // Object.is equality
```

The last argument of `createComponent` marks a component as its render's single
root, which receives fallthrough attributes. vize passes `true` for every
component, including one nested inside the root element:

```js
// official
const n0 = _createComponent(FallthroughInner)
// vize
const n0 = _createComponentWithFallback(_component_FallthroughInner, null, null, true);
```

## 6. `:key` outside `v-for` is dropped

Fork: issue [Hebilicious/vize#11](https://github.com/Hebilicious/vize/issues/11), fixed by [#12](https://github.com/Hebilicious/vize/pull/12).

`src/KeyedText.vue` renders `<p id="keyed" :key="version">Version {{ version }}</p>`.
After `version` changes, `#keyed` must be a new element. vize keeps the old one:

```
AssertionError: expected <p id="keyed"></p> not to be <p id="keyed"></p> // Object.is equality
```

Vue's compiler wraps the keyed element in `createKeyedFragment`, which replaces
it when the key changes. vize compiles the element into its parent's template
and the binding disappears. The same happens to `:key` on a component, such as a
`<TransitionGroup :key="page">` meant to restart for each page:

```js
// official
const n1 = _createKeyedFragment(() => (version.value), () => {
  const n2 = t0()
  return n2
})
// vize
const t0 = _template("<div><button id=\"next-version\" type=\"button\">Next version</button><p id=\"keyed\">Version  </p></div>", true);
```

## 7. A renamed or nested slot-prop destructure reads the wrong key

Fork: issue [Hebilicious/vize#13](https://github.com/Hebilicious/vize/issues/13), fixed by [#14](https://github.com/Hebilicious/vize/pull/14).

`src/SlotOwner.vue` renders `<slot :props="trigger" />`, and `src/SlotConsumer.vue`
reads it twice: renamed, `v-slot="{ props: trigger }"`, and nested,
`v-slot="{ props: { label } }"`. Mounting throws:

```
TypeError: Cannot read properties of undefined (reading 'id')
```

Vue's compiler reads each name through the key it was destructured from. vize
reads the local name as if it were the slot prop's own key, so `trigger` becomes
`_slotProps0.trigger` and `label` becomes `_slotProps1.label`, both `undefined`:

```js
// official
const _trigger = _slotProps0.props;
_setProp(n0, "id", _trigger.id);
_renderEffect(() => _setText(x2, _toDisplayString(_slotProps0.props.label)));
// vize
_setProp(n3, "id", _slotProps0.trigger.id);
_renderEffect(() => _setText(x4, _toDisplayString(_slotProps1.label)));
```

A plain `v-slot="{ props }"` works on both sides; only a rename or a nested
pattern breaks.

## 8. A template ref never fills the `ref` binding it names

Fork: issue [Hebilicious/vize#15](https://github.com/Hebilicious/vize/issues/15), fixed by [#16](https://github.com/Hebilicious/vize/pull/16).

`src/BindingRef.vue` declares `const field = shallowRef(null)`, renders
`<input ref="field">`, and reads `field` in `onMounted`. `#binding-state` stays
`null`:

```
AssertionError: expected 'null' to be 'INPUT' // Object.is equality
```

Both compilers name the ref by a string, which Vapor resolves against the
instance's `setupState`, and only in development. Vue's compiler returns the
setup bindings, so the runtime builds `setupState` from them (and its production
output passes the ref object itself). vize returns the render block and sets
`setupState` itself, through `getCurrentInstance()`, which returns `null` for a
Vapor instance, so the binding is never reached; in production the string would
reach only `instance.refs` anyway:

```js
// official
const __returned__ = { field, seen };
return __returned__;
_setStaticTemplateRef(n0, "field")
// vize
const __instance = _getCurrentInstance();
const __ctx = _proxyRefs(__returned__);
if (__instance) __instance.setupState = __ctx;
_setRef(n0, "field");
```

`useTemplateRef("field")` works on both sides, because it reads `instance.refs`.

## Versions

- Node 24.17.0, Linux x86_64 (WSL2)
- `vue` / `@vue/runtime-vapor`: `3.6.0-rc.10`
- `vize` side: `@vizejs/vite-plugin@0.434.0`, `vite@8.3.2`
- `official` side: `@vitejs/plugin-vue@6.0.7`, `vite@7.3.6`
- `vitest@4.1.11`, `@vitest/browser-playwright@4.1.11`, `playwright-core@1.63.0`
