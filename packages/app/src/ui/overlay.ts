import { ObjectInstance } from "@helios/engine";
import { AnyComponentInstance } from "@helios/engine";

/**
 * DOM chrome — Zero Labs design language (see src/styles/helios.css).
 * Header + object list (left) + focused-object info (right) + sim HUD (bottom).
 */

export interface HeliosUIHandlers {
  onFocus: (id: string) => void;
  onTimeRate: (rate: number) => void;
  onPause: (paused: boolean) => void;
}

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const SECONDS_PER_DAY = 86400;
const AU_M = 1.495978707e11;
const L_SUN_W = 3.828e26;
const ATM_PA = 101325;

export class HeliosUI {
  private root: HTMLElement;
  private listEl: HTMLElement;
  private rateEl: HTMLInputElement;
  private rateLabel: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private infoEl: HTMLElement;
  private clockEl: HTMLElement;
  private dayClockEl: HTMLElement;
  private countEl: NodeListOf<HTMLElement>;
  private handlers: HeliosUIHandlers;
  private paused = false;
  timeRate = 1;

  get isPaused(): boolean {
    return this.paused;
  }

  constructor(container: HTMLElement, handlers: HeliosUIHandlers) {
    this.handlers = handlers;
    this.root = document.createElement("div");
    this.root.className = "helios-chrome";
    this.root.innerHTML = layout();

    container.appendChild(this.root);

    this.listEl = this.root.querySelector("#obj-list")!;
    this.rateEl = this.root.querySelector("#rate")!;
    this.rateLabel = this.root.querySelector("#rate-label")!;
    this.pauseBtn = this.root.querySelector("#pause-btn")!;
    this.infoEl = this.root.querySelector("#info")!;
    this.clockEl = this.root.querySelector("#clock-sim")!;
    this.dayClockEl = this.root.querySelector("#clock-day")!;
    this.countEl = this.root.querySelectorAll("#obj-count, #obj-count-2");

    this.rateEl.addEventListener("input", () => {
      this.timeRate = rateFromSlider(parseFloat(this.rateEl.value));
      this.rateLabel.textContent = formatRate(this.timeRate);
      this.handlers.onTimeRate(this.timeRate);
    });
    this.pauseBtn.addEventListener("click", () => {
      this.paused = !this.paused;
      this.pauseBtn.classList.toggle("paused", this.paused);
      this.pauseBtn.textContent = this.paused ? "Run" : "Pause";
      this.handlers.onPause(this.paused);
    });
  }

  setObjects(iter: Iterable<ObjectInstance>): void {
    const frag = document.createDocumentFragment();
    let n = 0;
    for (const inst of iter) {
      const item = document.createElement("button");
      item.className = "obj-item";
      item.dataset.id = inst.id;
      const cls = inst.object.identity.classification;
      const kind = cls.subtype ?? cls.primary;
      item.innerHTML =
        `<span class="obj-name">${esc(inst.object.identity.name)}</span>` +
        `<span class="obj-kind">${esc(kind)}</span>`;
      item.addEventListener("click", () => this.handlers.onFocus(inst.id));
      frag.appendChild(item);
      n++;
    }
    this.listEl.replaceChildren(frag);
    this.countEl.forEach((el) => (el.textContent = String(n)));
  }

  showInfo(inst: ObjectInstance | null): void {
    const panel = this.root.querySelector("#info-panel-wrapper")! as HTMLElement;
    panel.style.display = inst ? "block" : "none";
    if (!inst) {
      this.infoEl.innerHTML = `<div id="info-empty">no object</div>`;
      return;
    }
    const o = inst.object;
    const cls = o.identity.classification;
    const kind = [cls.primary, cls.subtype].filter(Boolean).join(" · ");
    const lines: string[] = [];

    lines.push(
      `<div class="info-title">${esc(o.identity.name)}</div>`,
      `<div class="info-status">${esc(kind)} — ${esc(o.status ?? "confirmed")}</div>`
    );

    const m = o.measurements ?? {};
    const meas: Array<[string, string]> = [];
    if (m.radius) meas.push(["RADIUS", fmt(m.radius.value, m.radius.unit)]);
    if (m.mass) meas.push(["MASS", fmt(m.mass.value, m.mass.unit)]);
    if (m.effective_temperature)
      meas.push(["T\u2091\u1D63\u2091", fmt(m.effective_temperature.value, m.effective_temperature.unit)]);
    if (m.position?.distance)
      meas.push(["DISTANCE", fmt(m.position.distance.value, m.position.distance.unit)]);
    if (m.density) meas.push(["DENSITY", fmt(m.density.value, m.density.unit)]);
    if (meas.length) lines.push(section("measurements", rows(meas)));

    const d = o.derived ?? {};
    const derived: Array<[string, string]> = [];
    if (d.luminosity) derived.push(["LUMINOSITY", fmt(d.luminosity.value, d.luminosity.unit)]);
    if (derived.length) lines.push(section("derived", rows(derived)));

    const compRows: Array<[string, string]> = [];
    for (const comp of inst.components.values()) {
      compRows.push(...componentRows(comp));
    }
    if (compRows.length) lines.push(section("components", rows(compRows)));

    if (o.identity.designations?.length) {
      const tags = o.identity.designations.map((n) => `<span>${esc(n)}</span>`).join("");
      lines.push(section("designations", `<div class="info-designations">${tags}</div>`));
    }

    this.infoEl.innerHTML = lines.join("");
  }

  setActive(id: string): void {
    for (const item of this.listEl.querySelectorAll<HTMLElement>(".obj-item")) {
      item.classList.toggle("active", item.dataset.id === id);
    }
  }

  setActiveInfoVisible(visible: boolean): void {
    const p = this.root.querySelector("#info-panel-wrapper")! as HTMLElement;
    p.style.display = visible ? "block" : "none";
  }

  /** Per-frame HUD update. simTimeS is the running simulation epoch in seconds. */
  updateHUD(simTimeS: number): void {
    const d = new Date(J2000_MS + simTimeS * 1000);
    this.clockEl.textContent = d.toISOString().slice(0, 10);
    this.dayClockEl.textContent = d.toISOString().slice(11, 19) + "Z";
  }
}

/* ——— formatting helpers ——————————————————————————— */

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function fmt(v: number, unit: string): string {
  let num: string;
  const a = Math.abs(v);
  if (a === 0) num = "0";
  else if (a >= 1e6 || a < 1e-3) num = v.toExponential(2);
  else if (a >= 1e3 || a < 1e-2) num = v.toPrecision(4);
  else num = v.toPrecision(3);
  return `${num} <sub>${esc(unit)}</sub>`;
}

/** Map a slider position in [0, 1000] to a log time-rate in [1e-6, 1e6]. */
function rateFromSlider(v: number): number {
  return Math.pow(10, ((v / 1000) - 0.5) * 12);
}

function formatRate(r: number): string {
  const a = Math.abs(r);
  if (a >= 1e6) return (r / 1e6).toFixed(1) + "M×";
  if (a >= 1e3) return (r / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "k×";
  if (a >= 100) return r.toFixed(0) + "×";
  if (a >= 1) return r.toFixed(1) + "×";
  if (a >= 0.01) return r.toPrecision(2) + "×";
  return r.toExponential(1) + "×";
}

function section(title: string, body: string): string {
  return `<section class="info-section"><h4>${title}</h4>${body}</section>`;
}

function rows(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `<div class="info-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");
}

function componentRows(comp: AnyComponentInstance): Array<[string, string]> {
  switch (comp.type) {
    case "orbit": {
      const r: Array<[string, string]> = [];
      if (comp.semiMajorAxisM !== undefined)
        r.push(["ORBIT · A", `${(comp.semiMajorAxisM / AU_M).toPrecision(4)} <sub>AU</sub>`]);
      if (comp.periodS !== undefined) {
        const d = comp.periodS / SECONDS_PER_DAY;
        r.push(["ORBIT · P", d >= 30 ? `${(d / 365.25).toPrecision(3)} <sub>yr</sub>` : `${d.toPrecision(4)} <sub>d</sub>`]);
      }
      if (comp.eccentricity !== undefined)
        r.push(["ORBIT · E", comp.eccentricity.toPrecision(3)]);
      r.push(["PRIMARY", shortId(comp.primary)]);
      return r;
    }
    case "light_source":
      return [
        ["LUMINOSITY", `${(comp.luminosityW / L_SUN_W).toPrecision(4)} <sub>L_sun</sub>`],
        ["TEMPERATURE", `${comp.effectiveTemperatureK.toFixed(0)} <sub>K</sub>`],
        ["SPECTRUM", comp.spectrum],
      ];
    case "atmosphere": {
      const r: Array<[string, string]> = [];
      if (comp.surfacePressurePa !== undefined)
        r.push(["PRESSURE", `${(comp.surfacePressurePa / ATM_PA).toPrecision(3)} <sub>atm</sub>`]);
      const top = Object.entries(comp.composition)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g, f]) => `${g} ${(f * 100).toFixed(1)}%`)
        .join(" · ");
      if (top) r.push(["COMPOSITION", top]);
      return r;
    }
    case "terrain":
      return [[comp.class.toUpperCase(), ""]];
    case "ocean":
      return [["OCEAN", "present"]];
  }
}

function shortId(id: string): string {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

/* ——— chrome layout ——————————————————————————————— */

function layout(): string {
  return `
<div class="helios-chrome">
  <section class="helios-panel" id="obj-list-panel">
    <div class="panel-head">
      <span class="eyebrow">Universe · <b id="obj-count">0</b></span>
    </div>
    <div id="obj-list"></div>
  </section>

  <aside class="helios-panel" id="info-panel-wrapper" style="display:none;">
    <div id="info"></div>
  </aside>

  <footer class="helios-hud">
    <div class="hud-group">
      <span class="hud-clock-label">Sim · UTC</span>
      <span class="hud-clock" id="clock-sim">2000-01-01</span>
      <span class="hud-clock" id="clock-day">12:00:00Z</span>
    </div>
    <div class="hud-group" id="hud-rate">
      <span class="eyebrow">Rate</span>
      <input id="rate" type="range" min="0" max="1000" step="1" value="500"/>
      <span id="rate-label">1.0×</span>
      <button class="hud-btn" id="pause-btn">Pause</button>
    </div>
  </footer>
</div>
`;
}