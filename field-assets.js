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
    retired: "Retired"
  };
  let assets = [];
  let departments = [];
  let locations = [];
  let employees = [];
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

  function assetRegister() {
    return `<section class="journal-page">${journalHead("Asset Register", "more")}<main class="paper-workflow asset-register-page">${workflowHeading("tools", "MAINTENANCE & FLEET", "Estate Asset Register", "A secure register of approved estate vehicles, machinery, equipment and infrastructure.")}<section class="asset-register-summary"><article><strong>${assets.length}</strong><span>Registered assets</span></article><article><strong>${assets.filter(asset => asset.status === "active").length}</strong><span>Active</span></article><article><strong>${assets.filter(asset => asset.status === "under_repair" || asset.status === "unavailable").length}</strong><span>Unavailable</span></article></section><button class="journal-primary asset-add-button" onclick="go('asset-add')">Add Estate Asset <span>→</span></button><section class="asset-register-list">${assets.length ? assets.map(asset => `<article><i class="asset-category-mark">${esc((categories[asset.category] || "Asset").slice(0, 1))}</i><div><small>${esc(categories[asset.category] || asset.category)}</small><strong>${esc(asset.name)}</strong><span>${esc(asset.registration_number || asset.asset_number)}</span><em>${esc(asset.department_name || "Estate")} · ${esc(statuses[asset.status] || asset.status)}</em></div></article>`).join("") : `<div class="asset-register-empty"><i></i><h3>No estate assets registered yet</h3><p>Add the first real asset when its approved details are available. No example or invented assets have been added.</p></div>`}</section><p class="journal-device-note"><strong>Controlled estate register</strong><span>Asset numbers are generated automatically and cannot be manually duplicated.</span></p></main></section>`;
  }

  function assetAdd() {
    const departmentOptions = departments.map(item => option(item.id, item.name)).join("");
    const locationOptions = locations.map(item => option(item.id, item.name)).join("");
    const employeeOptions = employees.map(item => option(item.id, item.preferred_name)).join("");
    return `<section class="journal-page">${journalHead("Add Estate Asset", "asset-register")}<main class="paper-workflow asset-add-page">${workflowHeading("form", "MAINTENANCE & FLEET", "Register an Asset", "Enter the verified estate details. The Crown & Cross asset number will be created automatically.")}<form onsubmit="submitEstateAsset(event)"><fieldset><legend>Asset identity</legend><label class="journal-field"><strong>Asset category</strong><select name="category" required><option value="">Select category</option>${Object.entries(categories).map(([value, label]) => option(value, label)).join("")}</select></label><label class="journal-field"><strong>Asset name</strong><input name="name" placeholder="Verified estate name" required></label><label class="journal-field"><strong>Vehicle registration</strong><input name="registration_number" autocapitalize="characters" placeholder="If applicable"></label><label class="journal-field"><strong>Make</strong><input name="make" placeholder="If known"></label><label class="journal-field"><strong>Model</strong><input name="model" placeholder="If known"></label><label class="journal-field"><strong>Serial number</strong><input name="serial_number" placeholder="If applicable"></label></fieldset><fieldset><legend>Estate responsibility</legend><label class="journal-field"><strong>Department</strong><select name="department_id" required><option value="">Select department</option>${departmentOptions}</select></label><label class="journal-field"><strong>Normal location</strong><select name="location_id"><option value="">Not assigned</option>${locationOptions}</select></label><label class="journal-field"><strong>Responsible person</strong><select name="responsible_employee_id"><option value="">Unassigned</option>${employeeOptions}</select></label><label class="journal-field"><strong>Operational status</strong><select name="status" required>${Object.entries(statuses).map(([value, label]) => option(value, label, "active")).join("")}</select></label></fieldset><fieldset><legend>Lifecycle information</legend><label class="journal-field"><strong>Purchase date</strong><input name="purchase_date" type="date"></label><label class="journal-field"><strong>Next service date</strong><input name="next_service_date" type="date"></label><label class="journal-field"><strong>Next inspection date</strong><input name="next_inspection_date" type="date"></label><label class="journal-field"><strong>Notes</strong><textarea name="notes" placeholder="Verified notes, restrictions or servicing information"></textarea></label></fieldset><p class="asset-number-notice"><strong>Asset number</strong><span>Generated automatically when this record is saved.</span></p><div class="form-actions-v49"><button type="button" class="journal-secondary" onclick="go('asset-register')">Back to Register</button><button class="journal-primary">Save Asset <span>→</span></button></div></form></main></section>`;
  }

  async function refreshAssets(force = false) {
    if (refreshRunning || !window.CCEMSSupabase.readSession()?.access_token) return;
    if (!force && assetsLoaded) return;
    refreshRunning = true;
    try {
      const [assetRows, departmentRows, locationRows, employeeRows] = await Promise.all([
        window.CCEMSSupabase.select("assets", params("id,asset_number,category,name,registration_number,make,model,serial_number,department_id,location_id,responsible_employee_id,purchase_date,next_service_date,next_inspection_date,status,notes,created_at", { order: "name.asc", limit: "500" })),
        window.CCEMSSupabase.select("departments", params("id,code,name", { order: "name.asc" })),
        window.CCEMSSupabase.select("locations", params("id,reference,name,department_id", { order: "name.asc" })),
        window.CCEMSSupabase.select("employees", params("id,preferred_name", { order: "preferred_name.asc" }))
      ]);
      departments = departmentRows;
      locations = locationRows;
      employees = employeeRows;
      const departmentMap = new Map(departments.map(item => [item.id, item.name]));
      assets = assetRows.map(asset => ({ ...asset, category_label: categories[asset.category] || asset.category, department_name: departmentMap.get(asset.department_id) || "Estate" }));
      assetsLoaded = true;
      window.CCEMSAssets = assets.filter(asset => asset.status !== "retired");
      if (["asset-register", "asset-add", "form-equipment"].includes(view)) render();
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

  const previousMore = moreV49;
  moreV49 = function () {
    return previousMore().replace('<section class="field-tools-grid">', '<section class="field-tools-grid"><button onclick="go(\'asset-register\')"><i class="tool-icon tool-assets"></i><span><small>MAINTENANCE &amp; FLEET</small><strong>Asset Register</strong><em>Approved vehicles, machinery and estate equipment.</em></span><b>›</b></button>');
  };

  const previousRender = render;
  render = function () {
    if (view === "asset-register" || view === "asset-add") {
      app.innerHTML = view === "asset-register" ? assetRegister() : assetAdd();
      app.dataset.view = view;
      decorateOperationalPage();
      setTimeout(() => refreshAssets(), 0);
      return;
    }
    previousRender();
    if (["home", "forms", "form-equipment", "more"].includes(view)) setTimeout(() => refreshAssets(), 0);
  };
})();
