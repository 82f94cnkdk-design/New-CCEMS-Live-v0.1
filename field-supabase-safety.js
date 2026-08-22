(function () {
  const departmentCodes = {
    "Heritage Eggs": "heritage_eggs",
    "Animals & Production": "animals_production",
    "Land & Crops": "land_crops",
    "Maintenance & Fleet": "maintenance_fleet",
    "Estate Operations": "estate_operations",
    "People & Training": "people_training"
  };
  const formTypes = {
    risk: "risk_assessment",
    equipment: "equipment_check",
    coshh: "coshh",
    training: "training",
    incident: "incident"
  };
  let retryRunning = false;

  async function syncPreTask(clientReference) {
    const saved = state();
    const record = (saved.preTaskSafety || []).find(item => (item.clientReference || item.reference) === clientReference);
    if (!record?.supabaseSync || record.supabaseSync.status === "synced") return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;
    record.supabaseSync.status = "syncing";
    record.supabaseSync.lastAttemptAt = new Date().toISOString();
    save(saved);
    try {
      const result = await window.CCEMSSupabase.rpc("submit_pre_task_safety_record", {
        p_client_reference: clientReference,
        p_department_code: "heritage_eggs",
        p_confirmations: { completed: record.confirmations, total: record.confirmations }
      });
      const latest = state();
      const current = (latest.preTaskSafety || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!current) return;
      current.reference = result?.[0]?.record_reference || current.reference;
      current.supabaseSync = { ...current.supabaseSync, status: "synced", recordId: result?.[0]?.record_id || null, reference: result?.[0]?.record_reference || "", syncedAt: new Date().toISOString(), error: null };
      save(latest);
    } catch (error) {
      const latest = state();
      const current = (latest.preTaskSafety || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!current) return;
      current.supabaseSync.status = "pending";
      current.supabaseSync.error = error.message || "Supabase unavailable";
      save(latest);
    }
  }

  async function syncSafetyForm(clientReference) {
    const saved = state();
    const record = (saved.safetyForms || []).find(item => (item.clientReference || item.reference) === clientReference);
    if (!record?.supabaseSync || record.supabaseSync.status === "synced") return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;
    record.supabaseSync.status = "syncing";
    record.supabaseSync.lastAttemptAt = new Date().toISOString();
    save(saved);
    try {
      const fields = Object.fromEntries(Object.entries(record.data || {}).filter(([key]) => /^field_[0-9]{1,2}$/.test(key)));
      const result = await window.CCEMSSupabase.rpc("submit_safety_record", {
        p_client_reference: clientReference,
        p_form_type: formTypes[record.type],
        p_department_code: departmentCodes[record.department],
        p_fields: fields
      });
      const latest = state();
      const current = (latest.safetyForms || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!current) return;
      current.reference = result?.[0]?.record_reference || current.reference;
      current.supabaseSync = { ...current.supabaseSync, status: "synced", recordId: result?.[0]?.record_id || null, reference: result?.[0]?.record_reference || "", syncedAt: new Date().toISOString(), error: null };
      save(latest);
    } catch (error) {
      const latest = state();
      const current = (latest.safetyForms || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!current) return;
      current.supabaseSync.status = "pending";
      current.supabaseSync.error = error.message || "Supabase unavailable";
      save(latest);
    }
    if (["forms", "journal", "journal-detail"].includes(view)) render();
  }

  async function retryPending() {
    if (retryRunning || !window.CCEMSSupabase.readSession()?.access_token) return;
    retryRunning = true;
    try {
      for (const record of state().preTaskSafety || []) {
        if (record.supabaseSync && record.supabaseSync.status !== "synced") await syncPreTask(record.clientReference || record.reference);
      }
      for (const record of state().safetyForms || []) {
        if (record.supabaseSync && record.supabaseSync.status !== "synced") await syncSafetyForm(record.clientReference || record.reference);
      }
    } finally {
      retryRunning = false;
    }
  }

  const previousPreTask = confirmPreTaskSafety;
  confirmPreTaskSafety = function () {
    const before = (state().preTaskSafety || []).length;
    previousPreTask();
    const saved = state();
    if ((saved.preTaskSafety || []).length <= before) return;
    const record = saved.preTaskSafety[0];
    record.clientReference = record.reference;
    record.supabaseSync = { status: "pending", lastAttemptAt: null, syncedAt: null, error: null };
    save(saved);
    syncPreTask(record.clientReference);
  };

  const previousSafetyForm = submitSafetyForm;
  submitSafetyForm = function (event, type) {
    const before = (state().safetyForms || []).length;
    previousSafetyForm(event, type);
    const saved = state();
    if ((saved.safetyForms || []).length <= before) return;
    const record = saved.safetyForms[0];
    record.clientReference = record.reference;
    record.supabaseSync = { status: "pending", lastAttemptAt: null, syncedAt: null, error: null };
    save(saved);
    syncSafetyForm(record.clientReference);
  };

  const previousRender = render;
  render = function () {
    previousRender();
    if (["home", "task", "forms", "journal", "journal-detail"].includes(view)) setTimeout(retryPending, 0);
  };
})();
