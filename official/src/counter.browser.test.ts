import { describe, expect, test } from "vitest";
import { createVaporApp } from "@vue/runtime-vapor";
import Counter from "./Counter.vue";

describe("vapor counter", () => {
  test("text updates after a click, through Vitest Browser Mode", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const app = createVaporApp(Counter);
    app.mount(container);
    expect(container.querySelector("#pure")?.textContent).toBe("1");
    container.querySelector("#bump")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(container.querySelector("#pure")?.textContent).toBe("6");
    expect(container.querySelector("#mixed")?.textContent).toBe("Count is 6");
  });
});
