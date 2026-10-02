const assets = [
  { id: "DT-03", feeder: "F101", capacity: "400 kVA", loss: 15.6, expected: "6.5–9.1%", score: 94, priority: "high", duration: "6h persistent", evidence: "Evening load peak · DT-level loss", voltage: "Normal" },
  { id: "DT-07", feeder: "F101", capacity: "250 kVA", loss: 11.2, expected: "4.1–8.0%", score: 78, priority: "medium", duration: "3h persistent", evidence: "Magnitude above learned range", voltage: "Normal" },
  { id: "DT-02", feeder: "F101", capacity: "315 kVA", loss: 9.8, expected: "3.0–7.6%", score: 66, priority: "medium", duration: "2h persistent", evidence: "Repeated evening deviation", voltage: "Normal" },
  { id: "DT-01", feeder: "F101", capacity: "400 kVA", loss: 6.2, expected: "3.0–8.2%", score: 18, priority: "normal", duration: "Within range", evidence: "No sustained deviation", voltage: "Normal" },
  { id: "DT-04", feeder: "F101", capacity: "250 kVA", loss: 5.4, expected: "2.8–8.4%", score: 14, priority: "normal", duration: "Within range", evidence: "No sustained deviation", voltage: "Normal" },
  { id: "DT-05", feeder: "F101", capacity: "160 kVA", loss: 7.1, expected: "3.2–9.3%", score: 12, priority: "normal", duration: "Within range", evidence: "No sustained deviation", voltage: "Normal" },
  { id: "DT-06", feeder: "F101", capacity: "315 kVA", loss: 4.7, expected: "2.5–7.8%", score: 9, priority: "normal", duration: "Within range", evidence: "No sustained deviation", voltage: "Normal" },
  { id: "DT-08", feeder: "F101", capacity: "200 kVA", loss: 6.0, expected: "3.1–8.5%", score: 7, priority: "normal", duration: "Within range", evidence: "No sustained deviation", voltage: "Normal" },
];

let selectedAssetId = "DT-03";
let activeInvestigationId = "DT-03";
let simulated = true;
let toastTimer;
let currentRange = "24h";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function priorityLabel(priority) {
  return priority === "normal" ? "Normal" : priority[0].toUpperCase() + priority.slice(1);
}

function updateAsset() {
  const asset = assets.find((item) => item.id === selectedAssetId) || assets[0];
  $("#selected-asset-name").firstChild.textContent = asset.id + " ";
  $("#selected-asset-meta").innerHTML = `${asset.feeder} <span>·</span> ${asset.capacity}`;
  $("#selected-score").innerHTML = `${asset.score}<span>%</span>`;
  $("#score-meter-fill").style.width = `${asset.score}%`;
  const expectedMidpoint = asset.id === "DT-03" ? 7.9 : asset.expected.split("–").map((value) => parseFloat(value)).reduce((sum, value) => sum + value, 0) / 2;
  const deviation = Math.max(0, asset.loss - expectedMidpoint);
  $("#evidence-loss").textContent = asset.priority === "normal" ? "Within range" : `+${deviation.toFixed(1)} pts`;
  $("#evidence-persistence").textContent = asset.priority === "normal" ? "No sustained deviation" : asset.duration.replace(" persistent", "");
  $("#evidence-deviation-label").textContent = asset.priority === "normal" ? "Loss within learned normal" : "Loss above learned normal";
  $("#asset-card-title").textContent = asset.priority === "normal" ? "Selected asset" : "Priority asset";
  $("#asset-card-subtitle").textContent = asset.priority === "normal" ? "No inspection suggested" : "Recommended first inspection";
  const badge = $(".priority-badge");
  badge.textContent = priorityLabel(asset.priority).toUpperCase();
  badge.className = `priority-badge${asset.priority === "medium" ? " medium-priority" : asset.priority === "normal" ? " normal-priority" : ""}`;
  $(".asset-identity .asset-status-dot").className = `asset-status-dot ${asset.priority}`;
  $(".asset-identity").style.borderColor = asset.priority === "high" ? "#f0e7e3" : "#e9efec";
  $(".asset-identity").style.background = asset.priority === "high" ? "#fffbf9" : "#fbfdfc";
  $("#metric-loss").innerHTML = `${asset.loss.toFixed(1)}<span class="metric-unit">%</span>`;
  $("#metric-context").textContent = `vs. expected ${asset.expected}`;
  $("#metric-change").textContent = asset.priority === "normal" ? "Within range" : `+${deviation.toFixed(1)} pts`;
  $("#metric-change").classList.toggle("positive", asset.priority !== "normal");
  $("#metric-change").classList.toggle("good", asset.priority === "normal");
  const flaggedAssets = assets.filter((item) => item.priority !== "normal");
  const highPriorityAssets = assets.filter((item) => item.priority === "high").length;
  $("#metric-assets").textContent = String(flaggedAssets.length).padStart(2, "0");
  $("#high-priority-count").textContent = `${highPriorityAssets} high priority`;
  $("#asset-progress-fill").style.width = `${flaggedAssets.length / assets.length * 100}%`;
  $("#chart-current").textContent = `${asset.loss.toFixed(1)}%`;
  $("#asset-review-button").innerHTML = `${asset.priority === "normal" ? "View open investigations" : "Review investigation"} <span>→</span>`;
  $("#simulate-label").textContent = simulated ? "Reset demo" : "Simulate loss";
  $$(".simulate-label-secondary").forEach((label) => { label.textContent = simulated ? "Reset demo" : "Simulate loss"; });
  $$(".alert-count, .nav-count.alert-count").forEach((count) => {
    count.textContent = String(assets.filter((item) => item.priority !== "normal").length).padStart(2, "0");
  });
}

function buildChart() {
  const svg = $("#loss-chart");
  const asset = assets.find((item) => item.id === selectedAssetId) || assets[0];
  const baseline = currentRange === "24h"
    ? [5.8, 6.3, 5.9, 6.7, 6.2, 7.0, 6.4, 7.2, 6.6, 7.1, 6.5, 7.7, 7.8, 7.6, 7.9, 7.9]
    : currentRange === "7d"
      ? [5.9, 6.3, 6.7, 5.7, 6.8, 7.2, 6.4, 6.9, 7.3, 6.7, 7.5, 8.0, 7.1, 6.8, 7.8, 7.9]
      : [5.2, 5.8, 6.0, 6.4, 5.9, 6.3, 6.8, 6.0, 7.2, 6.8, 6.5, 7.1, 7.6, 6.9, 7.8, 7.9];
  const values = asset.priority === "normal" ? baseline : baseline.map((value, index) => {
    if (index < baseline.length - 4) return value;
    const tail = [asset.loss - 0.3, asset.loss + 0.6, asset.loss + 0.3, asset.loss];
    return tail[index - (baseline.length - 4)];
  });
  const width = 760;
  const height = 184;
  const y = (value) => height - (value / 20) * height;
  const x = (index) => (index / (values.length - 1)) * width;
  const pathFor = (items) => items.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const [expectedMin, expectedMax] = asset.expected.split("–").map((value) => parseFloat(value));
  const normalTop = y(expectedMax);
  const normalBottom = y(expectedMin);
  const areaLine = values.map((_, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${normalTop}`).join(" ");
  const area = `${areaLine} L${width} ${normalBottom} ${values.map((_, i) => {
    const index = values.length - i - 1;
    return `L${x(index).toFixed(1)} ${normalBottom}`;
  }).join(" ")} Z`;
  const grid = [0, 1, 2, 3, 4].map((step) => {
    const lineY = (height / 4) * step;
    return `<line class="chart-grid-line" x1="0" y1="${lineY}" x2="${width}" y2="${lineY}"/>`;
  }).join("");
  const anomalyPath = values.slice(-4).map((value, index) => `${index ? "L" : "M"}${x(values.length - 4 + index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const lastPoint = { x: x(values.length - 1), y: y(values[values.length - 1]) };
  svg.innerHTML = `
    <defs><linearGradient id="loss-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#69b69a" stop-opacity=".13"/><stop offset="100%" stop-color="#69b69a" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path class="expected-area" d="${area}"/>
    <path class="expected-boundary" d="M0 ${normalTop} H${width} M0 ${normalBottom} H${width}"/>
    <path class="${asset.priority === "normal" ? "observed-line" : "observed-area"}" d="${pathFor(values)}"/>
    ${asset.priority !== "normal" ? `<path class="anomaly-line" d="${anomalyPath}"/><circle class="chart-point" cx="${lastPoint.x}" cy="${lastPoint.y}" r="4"/>` : ""}
  `;
  $("#chart-title").textContent = `${asset.id} loss trend`;
  $("#chart-expected").textContent = asset.expected;
  $("#x-labels").innerHTML = currentRange === "24h"
    ? "<span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span>"
    : currentRange === "7d"
      ? "<span>Sep 27</span><span>Sep 29</span><span>Oct 1</span><span>Oct 2</span><span>Now</span>"
      : "<span>Sep 4</span><span>Sep 11</span><span>Sep 18</span><span>Sep 25</span><span>Now</span>";
}

function topologyMarkup(large = false) {
  const transformerNodes = assets.map((asset, index) => ({
    id: asset.id,
    x: 98 + index * 120,
    status: asset.priority === "high" ? "alert" : asset.priority === "medium" ? "watch" : "normal",
  }));
  const edges = transformerNodes.map((node) => `<line class="edge" x1="${node.x}" y1="53" x2="${node.x}" y2="91"/>`).join("");
  const nodes = transformerNodes.map((node) => `
    <g class="topology-node" data-asset="${node.id}" tabindex="0" role="button" aria-label="Select ${node.id}, ${node.status === "alert" ? "investigate" : node.status === "watch" ? "monitor" : "normal"}">
      <title>${node.id} · ${node.status === "alert" ? "Investigate" : node.status === "watch" ? "Monitor" : "Normal"}</title>
      <circle class="node node-${node.status}${selectedAssetId === node.id ? " node-selected" : ""}" cx="${node.x}" cy="103" r="11"/>
      <text class="node-label" x="${node.x}" y="126" text-anchor="middle">${node.id}</text>
      <text class="node-note" x="${node.x}" y="139" text-anchor="middle">${node.status === "alert" ? "Investigate" : node.status === "watch" ? "Monitor" : "Normal"}</text>
    </g>`).join("");
  const viewBox = "0 0 1036 151";
  return `<svg class="topology-svg" viewBox="${viewBox}" role="img" aria-label="Feeder F101 topology showing eight transformer assets">
    <rect x="12" y="26" width="72" height="53" rx="6" fill="#f2f6f7" stroke="#dbe4e8"/>
    <path d="M35 49h25M35 56h25M41 43l-4 20m13-20-4 20" stroke="#547383" stroke-width="1.1" stroke-linecap="round"/>
    <text class="substation-label" x="48" y="72" text-anchor="middle">SUBSTATION</text>
    <line class="edge-trunk" x1="84" y1="53" x2="974" y2="53"/>
    <line class="edge-trunk" x1="84" y1="53" x2="84" y2="91"/>
    <rect x="430" y="30" width="129" height="18" rx="9" fill="#f3f6f7"/>
    <text x="494" y="42" text-anchor="middle">FEEDER F101 · 11 kV</text>
    ${edges}${nodes}
  </svg>`;
}

function renderTopology() {
  $("#topology-mini").innerHTML = topologyMarkup();
  $("#topology-large").innerHTML = topologyMarkup(true);
}

function renderAlerts() {
  const flagged = assets.filter((asset) => asset.priority !== "normal").sort((a, b) => b.score - a.score);
  $("#alert-list").innerHTML = flagged.map((asset, index) => `
    <div class="alert-row" data-asset="${asset.id}" tabindex="0" role="button" aria-label="View ${asset.id}, ${priorityLabel(asset.priority)} priority">
      <span class="alert-number ${asset.priority === "medium" ? "medium-number" : ""}">0${index + 1}</span>
      <span class="alert-name">${asset.id}<span class="alert-sub">${priorityLabel(asset.priority)} · ${asset.duration}</span></span>
      <span class="alert-score ${asset.priority === "medium" ? "medium-score" : ""}">${asset.score}%</span>
    </div>`).join("");
}

function renderAssetTable() {
  const search = ($("#asset-search")?.value || "").trim().toLowerCase();
  const priority = $("#priority-filter")?.value || "all";
  const filtered = assets.filter((asset) => {
    const matchesSearch = `${asset.id} ${asset.feeder} ${asset.capacity}`.toLowerCase().includes(search);
    return matchesSearch && (priority === "all" || asset.priority === priority);
  });
  $("#assets-table-body").innerHTML = filtered.length ? filtered.map((asset) => `
    <tr data-asset="${asset.id}" tabindex="0">
      <td><span class="table-asset"><span class="table-asset-icon ${asset.priority === "high" ? "high" : ""}">DT</span>${asset.id}</span></td>
      <td>${asset.feeder}</td><td>${asset.capacity}</td>
      <td class="loss-cell ${asset.priority === "high" ? "high-loss" : ""}">${asset.loss.toFixed(1)}%</td>
      <td>${asset.expected}</td>
      <td class="table-score ${asset.priority === "high" ? "high-score" : ""}">${asset.score}%</td>
      <td><span class="priority-pill ${asset.priority}">${priorityLabel(asset.priority)}</span></td>
      <td><button class="row-open" aria-label="Review ${asset.id}">↗</button></td>
    </tr>`).join("") : `<tr><td colspan="8" class="empty-state">No assets match your search.</td></tr>`;
  $("#filter-summary").textContent = `${filtered.length} asset${filtered.length === 1 ? "" : "s"}`;
  $("#asset-range").textContent = filtered.length;
}

function renderInvestigations() {
  const flagged = assets.filter((asset) => asset.priority !== "normal").sort((a, b) => b.score - a.score);
  $("#investigation-list").innerHTML = flagged.map((asset) => `
    <button class="investigation-card${activeInvestigationId === asset.id ? " selected" : ""}" data-investigation="${asset.id}">
      <div class="investigation-card-top"><h3>${asset.id} · ${asset.feeder}</h3><span class="priority-pill ${asset.priority}">${priorityLabel(asset.priority)}</span></div>
      <p>Transformer · ${asset.capacity} · ${asset.duration}</p>
      <div class="investigation-card-meta"><span>Observed ${asset.loss.toFixed(1)}% loss</span><strong>${asset.score}% confidence</strong></div>
    </button>`).join("");
  const asset = assets.find((item) => item.id === activeInvestigationId) || flagged[0];
  $("#investigation-detail").innerHTML = `
    <div class="detail-top"><div><h2>${asset.id} <span class="asset-status-dot ${asset.priority}"></span></h2><p>Feeder ${asset.feeder} <span>·</span> ${asset.capacity} transformer <span>·</span> Demo case</p></div><span class="priority-pill ${asset.priority}">${priorityLabel(asset.priority)} priority</span></div>
    <div class="detail-description"><strong>Suggested interpretation:</strong> ${asset.id} shows an abnormal loss pattern relative to its learned operating range. Investigate the asset and validate meter and network conditions before drawing conclusions.</div>
    <div class="detail-section-title">Evidence summary <span>Simulated · last 24 hours</span></div>
    <div class="detail-evidence">
      <div class="detail-evidence-row"><span class="evidence-symbol">✓</span> Observed loss <strong>${asset.loss.toFixed(1)}%</strong></div>
      <div class="detail-evidence-row"><span class="evidence-symbol">✓</span> Learned expected range <strong>${asset.expected}</strong></div>
      <div class="detail-evidence-row"><span class="evidence-symbol">✓</span> Persistence <strong>${asset.duration}</strong></div>
      <div class="detail-evidence-row"><span class="evidence-symbol">✓</span> Feeder voltage <strong>${asset.voltage}</strong></div>
      <div class="detail-evidence-row"><span class="evidence-symbol caution">!</span> Reconfiguration event <strong>None detected</strong></div>
    </div>
    <div class="investigation-next"><span><strong>Recommended verification</strong>Check DT meter health, reading synchronization, and recent topology changes.</span><span>01 / 03</span></div>
    <div class="investigation-actions"><button class="button button-outline" data-action="note">＋ Add field note</button><button class="button button-primary" data-action="review">Mark reviewed <span>✓</span></button></div>`;
}

function setSelectedAsset(id) {
  const asset = assets.find((item) => item.id === id);
  if (!asset) return;
  selectedAssetId = id;
  updateAsset();
  buildChart();
  renderTopology();
}

function navigate(view) {
  const target = document.getElementById(`view-${view}`);
  if (!target) return;
  $$(".view-panel").forEach((panel) => { panel.hidden = panel !== target; });
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $("#breadcrumb-current").textContent = ({
    overview: "Overview", network: "Feeder network", assets: "Transformer assets",
    investigations: "Investigations", data: "Data health",
  })[view];
  if (view === "investigations") renderInvestigations();
  if (view === "assets") renderAssetTable();
  $("#sidebar").classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}

function toggleSimulation() {
  simulated = !simulated;
  const affected = assets.find((asset) => asset.id === "DT-03");
  affected.loss = simulated ? 15.6 : 7.9;
  affected.score = simulated ? 94 : 18;
  affected.priority = simulated ? "high" : "normal";
  affected.duration = simulated ? "6h persistent" : "Within range";
  affected.evidence = simulated ? "Evening load peak · DT-level loss" : "No sustained deviation";
  buildChart();
  updateAsset();
  renderAlerts();
  renderTopology();
  renderAssetTable();
  renderInvestigations();
  showToast(simulated
    ? "Loss injected at DT-03. The sustained deviation is now highlighted for investigation."
    : "Demo reset. Synthetic feeder readings returned to the normal baseline.");
}

function exportAssets() {
  const headings = ["Transformer", "Feeder", "Capacity", "Observed loss", "Expected range", "Anomaly score", "Priority", "Evidence"];
  const rows = assets.map((asset) => [asset.id, asset.feeder, asset.capacity, `${asset.loss.toFixed(1)}%`, asset.expected, `${asset.score}%`, priorityLabel(asset.priority), asset.evidence]);
  const csv = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "gridguard-simulated-assets.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Synthetic asset register exported as CSV.");
}

function openInvestigationModal() {
  $("#modal-backdrop").hidden = false;
  $("#confirm-investigation").focus();
}

function closeInvestigationModal() {
  $("#modal-backdrop").hidden = true;
  $("#new-investigation").focus();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, [data-asset], [data-investigation], #modal-backdrop");
  if (!target) return;
  if (target.dataset.view) {
    if (target.dataset.view === "investigations") activeInvestigationId = selectedAssetId;
    navigate(target.dataset.view);
    return;
  }
  if (target.dataset.action === "simulate") { toggleSimulation(); return; }
  if (target.dataset.action === "note") { showToast("Field notes are local to a connected pilot and aren’t stored in this demo."); return; }
  if (target.dataset.action === "review") { showToast("Review recorded for this demo session only."); return; }
  if (target.dataset.asset) {
    setSelectedAsset(target.dataset.asset);
    if (target.closest("#assets-table-body")) {
      const asset = assets.find((item) => item.id === target.dataset.asset);
      if (asset.priority === "normal") {
        showToast(`${asset.id} is within its learned normal range; no investigation is open.`);
        return;
      }
      activeInvestigationId = target.dataset.asset;
      navigate("investigations");
      showToast(`Evidence opened for ${target.dataset.asset}.`);
    } else if (target.closest("#alert-list")) {
      showToast(`Priority asset ${target.dataset.asset} selected.`);
    }
    return;
  }
  if (target.dataset.investigation) {
    activeInvestigationId = target.dataset.investigation;
    renderInvestigations();
    return;
  }
  if (target.id === "new-investigation") { openInvestigationModal(); return; }
  if (target.id === "confirm-investigation") {
    closeInvestigationModal();
    activeInvestigationId = "DT-03";
    renderInvestigations();
    showToast("A local demo investigation for DT-03 has been created.");
    return;
  }
  if (target.id === "cancel-investigation" || target.classList.contains("modal-close")) { closeInvestigationModal(); return; }
  if (target.classList.contains("notice-dismiss")) { target.closest(".demo-notice").remove(); return; }
  if (target.id === "export-assets") { exportAssets(); return; }
  if (target.id === "menu-toggle") {
    const isOpen = $("#sidebar").classList.toggle("open");
    target.setAttribute("aria-expanded", String(isOpen));
    return;
  }
  if (target.id === "refresh-data") { showToast("Demo data checks refreshed. All simulated feeds are healthy."); return; }
  if (target.id === "modal-backdrop") closeInvestigationModal();
  if (target.classList.contains("help-button")) showToast("GridGuard is a software-only prototype using synthetic distribution data.");
});

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-asset], tbody tr")) {
    event.preventDefault();
    event.target.click();
  }
  if (event.key === "Escape" && !$("#modal-backdrop").hidden) closeInvestigationModal();
});

$("#time-range").addEventListener("change", (event) => { currentRange = event.target.value; buildChart(); });
$("#asset-search").addEventListener("input", renderAssetTable);
$("#priority-filter").addEventListener("change", renderAssetTable);
$(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  navigate("overview");
});

document.addEventListener("click", (event) => {
  const node = event.target.closest(".topology-node");
  if (node) {
    setSelectedAsset(node.dataset.asset);
    showToast(`${node.dataset.asset} selected in the feeder topology.`);
  }
});

renderAlerts();
renderTopology();
updateAsset();
buildChart();
renderAssetTable();
