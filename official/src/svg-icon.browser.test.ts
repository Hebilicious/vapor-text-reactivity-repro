import { describe, expect, test } from "vitest";
import { createVaporApp } from "@vue/runtime-vapor";
import SvgIcon from "./SvgIcon.vue";

const SVG_NS = "http://www.w3.org/2000/svg";

function mountIcon(): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  createVaporApp(SvgIcon, { tier: 1 }).mount(container);
  return container;
}

describe("vapor svg", () => {
  test("a v-if branch inside <svg> is created in the SVG namespace and renders", () => {
    const mark = mountIcon().querySelector("#mark-1")!;
    expect(mark.namespaceURI).toBe(SVG_NS);
    expect(mark.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  test("dynamic :class on an <svg> element is normalized", () => {
    const icon = mountIcon().querySelector("#icon")!;
    expect(icon.getAttribute("class")).toBe("icon tier-1");
  });

  test("dynamic :style on an <svg> element is applied", () => {
    const icon = mountIcon().querySelector<SVGSVGElement>("#icon")!;
    expect(icon.getAttribute("style")).not.toContain("[object Object]");
    expect(getComputedStyle(icon).color).toBe("rgb(200, 0, 0)");
  });
});
