import { createApp } from "./core/app.js";

const container = document.getElementById("app");
createApp(container ?? document.body);