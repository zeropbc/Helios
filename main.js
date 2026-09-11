import { createApp } from "./core/app.js";

const container = document.getElementById("app");
createApp(container ?? document.body).catch((error) => {
  console.error("Unable to start Helios:", error);
});