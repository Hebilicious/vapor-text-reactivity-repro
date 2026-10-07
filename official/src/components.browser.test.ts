import { describe, expect, test } from "vitest";
import { createVaporApp } from "@vue/runtime-vapor";
import { nextTick, type Component } from "vue";
import EventParent from "./EventParent.vue";
import FallthroughOuter from "./FallthroughOuter.vue";
import KeyedText from "./KeyedText.vue";
import RefParent from "./RefParent.vue";
import SlotConsumer from "./SlotConsumer.vue";

function mount(component: Component, props?: Record<string, unknown>): HTMLElement {
  const container = document.body.appendChild(document.createElement("div"));
  createVaporApp(component as never, props).mount(container);
  return container;
}

describe("vapor components", () => {
  test("3. a kebab-case listener receives the camelCase event it names", async () => {
    const root = mount(EventParent);
    root.querySelector<HTMLButtonElement>("#close-preset")!.click();
    await nextTick();
    expect(root.querySelector("#closed")!.textContent).toBe("true");
  });

  test("4. ref on a child component fills the parent's template ref", async () => {
    const root = mount(RefParent);
    await nextTick();
    expect(root.querySelector("#ref-state")!.textContent).toBe("hello");
  });

  test("5. fallthrough attributes reach only the root element, not a nested component", () => {
    const root = mount(FallthroughOuter, { "data-owner": "outer" });
    expect(root.querySelector("#outer")!.getAttribute("data-owner")).toBe("outer");
    expect(root.querySelector("#inner")!.hasAttribute("data-owner")).toBe(false);
  });

  test("6. a new :key replaces the keyed element", async () => {
    const root = mount(KeyedText);
    const first = root.querySelector("#keyed")!;
    root.querySelector<HTMLButtonElement>("#next-version")!.click();
    await nextTick();
    const second = root.querySelector("#keyed")!;
    expect(second.textContent).toBe("Version 2");
    expect(second).not.toBe(first);
  });

  test("7. a renamed or nested slot-prop destructure reads the slot prop it names", () => {
    const root = mount(SlotConsumer);
    expect(root.querySelector("#slot-trigger")?.textContent).toBe("Open");
    expect(root.querySelector("#nested-label")!.textContent).toBe("Open");
  });
});
