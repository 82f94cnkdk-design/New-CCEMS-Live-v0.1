(function () {
  const categories = {
    vehicle: "Vehicle",
    tractor_machinery: "Tractor & machinery",
    implement_attachment: "Implement & attachment",
    powered_equipment: "Powered equipment",
    hand_tool: "Hand tool",
    livestock_equipment: "Livestock equipment",
    egg_equipment: "Heritage egg equipment",
    estate_infrastructure: "Estate infrastructure",
    safety_equipment: "Safety equipment",
    it_device: "IT & approved device",
    other: "Other estate asset"
  };
  const statuses = {
    active: "Active",
    unavailable: "Unavailable",
    under_repair: "Under repair",
    isolated: "Isolated — do not use",
    retired: "Retired"
  };
  const eventTypes = {
    service: "Service completed",
    inspection: "Inspection completed",
    repair: "Repair completed",
    defect: "Defect reported",
    status_change: "Operational status changed"
  };
  let assets = [];
  let serviceRecords = [];
  let departments = [];
  let locations = [];
  let employees = [];
  let selectedAssetId = null;
  let signedInEmployeeId = null;
  let signedInEmployeeName = "Approved employee";
  let refreshRunning = false;
  let assetsLoaded = false;

  function esc(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function params(select, extra = {}) {
    return new URLSearchParams({ select, ...extra });
  }

  function option(value, label, selected = "") {
    return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
  }

  function formatDate(value) {
    if (!value) return "Not scheduled";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
  }

  function dueClass(value) {
    if (!value) return "";
    const today = new Date().toISOString().slice(0, 10);
    return value < today ? "overdue" : "scheduled";
  }

  function servicePicker(name, label, choices, selected = "", placeholder = "Select option") {
    const values = Object.keys(choices);
    return `<label class="journal-field safety-picker-label"><strong>${esc(label)}</strong></label><div class="house-picker safety-picker asset-service-picker" data-options="${encodeURIComponent(JSON.stringify(values))}"><input type="hidden" name="${esc(name)}" value="${esc(selected)}"><button type="button" class="house-select" aria-expanded="false" onclick="toggleSafetyPicker(this)"><span>${esc(choices[selected] || placeholder)}</span><b>⌄</b></button><div class="house-options safety-picker-options" hidden>${values.map((value, index) => `<button type="button" class="${value === selected ? "selected" : ""}" onclick="chooseAssetServiceOption('${esc(name)}',${index},this)"><span>${esc(label)}</span><strong>${esc(choices[value])}</strong></button>`).join("")}</div></div>`;
  }

  function assetRegister() {
    return `<section class="journal-page">${journalHead("Asset Register", "more")}<main class="paper-workflow asset-register-page">${workflowHeading("tools", "MAINTENANCE & FLEET", "Estate Asset Register", "A secure register of approved estate vehicles, machinery, equipment and infrastructure.")}<section class="asset-register-summary"><article><strong>${assets.length}</strong><span>Registered assets</span></article><article><strong>${assets.filter(asset => asset.status === "active").length}</strong><span>Active</span></article><article><strong>${assets.filter(asset => ["under_repair", "unavailable", "isolated"].includes(asset.status)).length}</strong><span>Unavailable</span></article></section><button class="journal-primary asset-add-button" onclick="go('asset-add')">Add Estate Asset <span>→</span></button><section class="asset-register-list">${assets.length ? assets.map(asset => `<button type="button" onclick="openAssetDetail('${asset.id}')"><i class="asset-category-mark">${esc((categories[asset.category] || "Asset").slice(0, 1))}</i><span><small>${esc(categories[asset.category] || asset.category)}</small><strong>${esc(asset.name)}</strong><span>${esc(asset.registration_number || asset.asset_number)}</span><em>${esc(asset.department_name || "Estate")} · ${esc(statuses[asset.status] || asset.status)}</em></span><b>›</b></button>`).join("") : `<div class="asset-register-empty"><i></i><h3>No estate assets registered yet</h3><p>Add the first real asset when its approved details are available. No example or invented assets have been added.</p></div>`}</section><p class="journal-device-note"><strong>Controlled estate register</strong><span>Open an asset to review its service, inspection, repair and defect history.</span></p></main></section>`;
  }

  function assetAdd() {
    const departmentOptions = departments.map(item => option(item.id, item.name)).join("");
    const locationOptions = locations.map(item => option(item.id, item.name)).join("");
    const employeeOptions = employees.map(item => option(item.id, item.preferred_name)).join("");
    return `<section class="journal-page">${journalHead("Add Estate Asset", "asset-register")}<main class="paper-workflow asset-add-page">${workflowHeading("form", "MAINTENANCE & FLEET", "Register an Asset", "Enter the verified estate details. The Crown & Cross asset number will be created automatically.")}<form onsubmit="submitEstateAsset(event)"><fieldset><legend>Asset identity</legend><label class="journal-field"><strong>Asset category</strong><select name="category" required><option value="">Select category</option>${Object.entries(categories).map(([value, label]) => option(value, label)).join("")}</select></label><label class="journal-field"><strong>Asset name</strong><input name="name" placeholder="Verified estate name" required></label><label class="journal-field"><strong>Vehicle registration</strong><input name="registration_number" autocapitalize="characters" placeholder="If applicable"></label><label class="journal-field"><strong>Make</strong><input name="make" placeholder="If known"></label><label class="journal-field"><strong>Model</strong><input name="model" placeholder="If known"></label><label class="journal-field"><strong>Serial number</strong><input name="serial_number" placeholder="If applicable"></label></fieldset><fieldset><legend>Estate responsibility</legend><label class="journal-field"><strong>Department</strong><select name="department_id" required><option value="">Select department</option>${departmentOptions}</select></label><label class="journal-field"><strong>Normal location</strong><select name="location_id"><option value="">Not assigned</option>${locationOptions}</select></label><label class="journal-field"><strong>Responsible person</strong><select name="responsible_employee_id"><option value="">Unassigned</option>${employeeOptions}</select></label><label class="journal-field"><strong>Operational status</strong><select name="status" required>${Object.entries(statuses).map(([value, label]) => option(value, label, "active")).join("")}</select></label></fieldset><fieldset><legend>Lifecycle information</legend><label class="journal-field"><strong>Purchase date</strong><input name="purchase_date" type="date"></label><label class="journal-field"><strong>Next service date</strong><input name="next_service_date" type="date"></label><label class="journal-field"><strong>Next inspection date</strong><input name="next_inspection_date" type="date"></label><label class="journal-field"><strong>Notes</strong><textarea name="notes" placeholder="Verified notes, restrictions or servicing information"></textarea></label></fieldset><p class="asset-number-notice"><strong>Asset number</strong><span>Generated automatically when this record is saved.</span></p><div class="form-actions-v49"><button type="button" class="journal-secondary" onclick="go('asset-register')">Back to Register</button><button class="journal-primary">Save Asset <span>→</span></button></div></form></main></section>`;
  }

  function assetDetail() {
    const asset = assets.find(item => item.id === selectedAssetId);
    if (!asset) return assetRegister();
    const history = serviceRecords.filter(record => record.asset_id === asset.id);
    return `<section class="journal-page">${journalHead(asset.name, "asset-register")}<main class="paper-workflow asset-detail-page">${workflowHeading("tools", "ASSET RECORD", asset.name, `${asset.asset_number} · ${categories[asset.category] || asset.category}`)}<section class="asset-status-banner status-${asset.status}"><small>OPERATIONAL STATUS</small><strong>${esc(statuses[asset.status] || asset.status)}</strong></section><section class="asset-detail-grid"><article><small>Registration / identifier</small><strong>${esc(asset.registration_number || asset.serial_number || asset.asset_number)}</strong></article><article><small>Make and model</small><strong>${esc([asset.make, asset.model].filter(Boolean).join(" ") || "Not recorded")}</strong></article><article><small>Department</small><strong>${esc(asset.department_name || "Estate")}</strong></article><article><small>Responsible person</small><strong>${esc(asset.responsible_name || "Unassigned")}</strong></article></section><section class="asset-due-grid"><article class="${dueClass(asset.next_service_date)}"><small>NEXT SERVICE</small><strong>${formatDate(asset.next_service_date)}</strong></article><article class="${dueClass(asset.next_inspection_date)}"><small>NEXT INSPECTION</small><strong>${formatDate(asset.next_inspection_date)}</strong></article></section><button class="journal-primary asset-service-button" onclick="go('asset-service-add')">Record Service, Repair or Defect <span>→</span></button><div class="records-title-v49"><span><small>SECURE HISTORY</small><h3>Asset Activity</h3></span><b>${history.length}</b></div><section class="asset-service-history">${history.length ? history.map(record => `<article><i>${esc((eventTypes[record.event_type] || "Record").slice(0, 1))}</i><div><small>${esc(eventTypes[record.event_type] || record.event_type)}</small><strong>${esc(record.summary)}</strong><span>${formatDate(record.occurred_on)} · ${esc(record.recorded_by_name || "Approved employee")}</span><em>${esc(statuses[record.resulting_status] || record.resulting_status)} · ${esc(record.reference)}</em>${record.work_performed ? `<p>${esc(record.work_performed)}</p>` : ""}</div></article>`).join("") : `<div class="asset-history-empty"><strong>No service history yet</strong><span>Service, inspection, repair and defect records will appear here.</span></div>`}</section><button class="journal-secondary" onclick="go('asset-register')">Back to Asset Register</button></main></section>`;
  }

  function assetServiceAdd() {
    const asset = assets.find(item => item.id === selectedAssetId);
    if (!asset) return assetRegister();
    const meterUnits = { none: "Not applicable", hours: "Hours", miles: "Miles", kilometres: "Kilometres", cycles: "Cycles" };
    return `<section class="journal-page">${journalHead("Asset Servicing", "asset-detail")}<main class="paper-workflow asset-service-page">${workflowHeading("form", "MAINTENANCE & FLEET", "Record Asset Activity", `${asset.name} · ${asset.asset_number}`)}<form onsubmit="submitAssetService(event)"><fieldset><legend>Activity details</legend>${servicePicker("event_type", "Record type", eventTypes, "", "Select record type")}<label class="journal-field"><strong>Date</strong><input name="occurred_on" type="date" value="${new Date().toISOString().slice(0, 10)}" required></label><label class="journal-field"><strong>Provider or person completing work</strong><input name="provider" value="${esc(signedInEmployeeName)}" readonly aria-readonly="true" required><small class="device-name-help">Automatically populated from the signed-in employee.</small></label><label class="journal-field"><strong>Summary</strong><input name="summary" placeholder="Brief verified description" required></label><label class="journal-field"><strong>Work performed or defect details</strong><textarea name="work_performed" placeholder="Record the work, findings, parts, restrictions or required action"></textarea></label></fieldset><fieldset><legend>Reading and cost</legend><label class="journal-field"><strong>Meter reading</strong><input name="meter_reading" type="number" min="0" step="0.01" placeholder="If applicable"></label>${servicePicker("meter_unit", "Meter unit", meterUnits, "none", "Not applicable")}<label class="journal-field"><strong>Cost</strong><input name="cost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="If known"></label></fieldset><fieldset><legend>Outcome and next dates</legend>${servicePicker("resulting_status", "Operational status after this record", statuses, asset.status, "Select status")}<label class="journal-field"><strong>Next service date</strong><input name="next_service_date" type="date" value="${esc(asset.next_service_date || "")}"></label><label class="journal-field"><strong>Next inspection date</strong><input name="next_inspection_date" type="date" value="${esc(asset.next_inspection_date || "")}"></label></fieldset><p class="asset-number-notice"><strong>Permanent history</strong><span>This activity will be retained against ${esc(asset.asset_number)} and shared across approved devices.</span></p><div class="form-actions-v49"><button type="button" class="journal-secondary" onclick="go('asset-detail')">Back to Asset</button><button class="journal-primary">Save Activity <span>→</span></button></div></form></main></section>`;
  }

  async function refreshAssets(force = false) {
    if (refreshRunning || !window.CCEMSSupabase.readSession()?.access_token) return;
    if (!force && assetsLoaded) return;
    refreshRunning = true;
    try {
      const [assetRows, serviceRows, departmentRows, locationRows, employeeRows, signedInEmployee] = await Promise.all([
        window.CCEMSSupabase.select("assets", params("id,asset_number,category,name,registration_number,make,model,serial_number,department_id,location_id,responsible_employee_id,purchase_date,next_service_date,next_inspection_date,status,notes,created_at", { order: "name.asc", limit: "500" })),
        window.CCEMSSupabase.select("asset_service_records", params("id,reference,asset_id,event_type,occurred_on,provider,summary,work_performed,meter_reading,meter_unit,cost,resulting_status,next_service_date,next_inspection_date,recorded_by_employee_id,created_at", { order: "occurred_on.desc,created_at.desc", limit: "1000" })),
        window.CCEMSSupabase.select("departments", params("id,code,name", { order: "name.asc" })),
        window.CCEMSSupabase.select("locations", params("id,reference,name,department_id", { order: "name.asc" })),
        window.CCEMSSupabase.select("employees", params("id,preferred_name", { order: "preferred_name.asc" })),
        window.CCEMSSupabase.currentEmployee(window.CCEMSSupabase.readSession().user.id)
      ]);
      departments = departmentRows;
      locations = locationRows;
      employees = employeeRows;
      signedInEmployeeId = signedInEmployee.id;
      signedInEmployeeName = signedInEmployee.preferred_name || "Approved employee";
      const departmentMap = new Map(departments.map(item => [item.id, item.name]));
      const employeeMap = new Map(employees.map(item => [item.id, item.preferred_name]));
      assets = assetRows.map(asset => ({ ...asset, category_label: categories[asset.category] || asset.category, department_name: departmentMap.get(asset.department_id) || "Estate", responsible_name: employeeMap.get(asset.responsible_employee_id) || "Unassigned" }));
      serviceRecords = serviceRows.map(record => ({ ...record, recorded_by_name: employeeMap.get(record.recorded_by_employee_id) || "Approved employee" }));
      assetsLoaded = true;
      window.CCEMSAssets = assets.filter(asset => asset.status !== "retired");
      if (["asset-register", "asset-add", "asset-detail", "asset-service-add", "form-equipment"].includes(view)) render();
    } catch (error) {
      console.warn("Asset Register refresh is unavailable", error);
    } finally {
      refreshRunning = false;
    }
  }

  window.submitEstateAsset = async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const session = window.CCEMSSupabase.readSession();
    if (!session?.user?.id) return alert("Please sign in again before registering an asset.");
    ["registration_number", "make", "model", "serial_number", "location_id", "responsible_employee_id", "purchase_date", "next_service_date", "next_inspection_date"].forEach(key => {
      data[key] = String(data[key] || "").trim() || null;
    });
    data.name = String(data.name || "").trim();
    data.notes = String(data.notes || "").trim();
    data.created_by = session.user.id;
    try {
      const rows = await window.CCEMSSupabase.insert("assets", data);
      const created = rows?.[0];
      await refreshAssets(true);
      alert(`Asset registered successfully. Asset number: ${created?.asset_number || "generated"}`);
      go("asset-register");
    } catch (error) {
      alert(`Asset could not be registered. ${error.message}`);
    }
  };

  window.openAssetDetail = function (assetId) {
    selectedAssetId = assetId;
    go("asset-detail");
  };

  window.chooseAssetServiceOption = function (name, index, button) {
    const picker = button.closest(".asset-service-picker");
    const values = JSON.parse(decodeURIComponent(picker.dataset.options));
    const value = values[index];
    const label = button.querySelector("strong").textContent;
    picker.querySelector(`input[name="${name}"]`).value = value;
    picker.querySelector(".house-select span").textContent = label;
    picker.querySelector(".house-select").classList.remove("open");
    picker.querySelector(".house-select").setAttribute("aria-expanded", "false");
    picker.classList.remove("menu-open");
    picker.querySelector(".safety-picker-options").hidden = true;
    picker.querySelectorAll(".safety-picker-options button").forEach((item, itemIndex) => item.classList.toggle("selected", itemIndex === index));
  };

  window.submitAssetService = async function (event) {
    event.preventDefault();
    const asset = assets.find(item => item.id === selectedAssetId);
    const session = window.CCEMSSupabase.readSession();
    if (!asset || !session?.user?.id || !signedInEmployeeId) return alert("Please sign in again before recording asset activity.");
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    ["provider", "work_performed", "meter_reading", "meter_unit", "cost", "next_service_date", "next_inspection_date"].forEach(key => {
      data[key] = String(data[key] || "").trim() || null;
    });
    if (data.meter_unit === "none") data.meter_unit = null;
    data.asset_id = asset.id;
    data.summary = String(data.summary || "").trim();
    data.recorded_by_employee_id = signedInEmployeeId;
    data.created_by = session.user.id;
    try {
      const rows = await window.CCEMSSupabase.insert("asset_service_records", data);
      await refreshAssets(true);
      alert(`Asset activity saved successfully. Reference: ${rows?.[0]?.reference || "generated"}`);
      go("asset-detail");
    } catch (error) {
      alert(`Asset activity could not be saved. ${error.message}`);
    }
  };

  const previousMore = moreV49;
  moreV49 = function () {
    return previousMore().replace('<section class="field-tools-grid">', '<section class="field-tools-grid"><button onclick="go(\'asset-register\')"><i class="tool-icon tool-assets"></i><span><small>MAINTENANCE &amp; FLEET</small><strong>Asset Register</strong><em>Approved vehicles, machinery and estate equipment.</em></span><b>›</b></button>');
  };

  const previousRender = render;
  render = function () {
    if (["asset-register", "asset-add", "asset-detail", "asset-service-add"].includes(view)) {
      app.innerHTML = ({ "asset-register": assetRegister, "asset-add": assetAdd, "asset-detail": assetDetail, "asset-service-add": assetServiceAdd }[view])();
      app.dataset.view = view;
      decorateOperationalPage();
      setTimeout(() => refreshAssets(), 0);
      return;
    }
    previousRender();
    if (["home", "forms", "form-equipment", "more"].includes(view)) setTimeout(() => refreshAssets(), 0);
  };
})();
