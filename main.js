import { createApp } from "./core/app.js?v=separate-systems-2";

const container = document.getElementById("app");
createApp(container ?? document.body).catch((error) => {
  console.error("Unable to start Helios:", error);
});