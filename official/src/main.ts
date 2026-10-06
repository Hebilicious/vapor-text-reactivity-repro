import { createVaporApp } from "@vue/runtime-vapor";
import Counter from "./Counter.vue";
import SvgIcon from "./SvgIcon.vue";

createVaporApp(Counter).mount("#app");
createVaporApp(SvgIcon, { tier: 1 }).mount("#svg");
