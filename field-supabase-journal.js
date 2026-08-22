(function () {
  const welfareLabels = {
    good: "Good — no action required",
    monitor: "Monitor — follow-up required",
    concern: "Immediate attention required",
    urgent: "Immediate attention required"
  };
  const safetyFormTypes = {
    risk_assessment: { type: "risk", title: "Risk Assessment" },
    equipment_check: { type: "equipment", title: "Equipment Safety Check" },
    coshh: { type: "coshh", title: "COSHH Assessment" },
    training: { type: "training", title: "Training & Induction Record" },
    incident: { type: "incident", title: "Incident & Near-Miss Record" }
  };
  const departmentNames = {
    heritage_eggs: "Heritage Eggs",
    animals_production: "Animals & Production",
    land_crops: "Land & Crops",
    maintenance_fleet: "Maintenance & Fleet",
    estate_operations: "Estate Operations",
    people_training: "People & Training"
  };
  const safetyStatuses = {
    draft: "Draft",
    submitted: "Awaiting supervisor review",
    under_review: "Under supervisor review",
    approved: "Approved",
    changes_required: "Changes required",
    amended: "Amended"
  };
  let refreshRunning = false;
  let nextRefreshAt = 0;

  function query(select, extra = {}) {
    return new URLSearchParams({ select, ...extra });
  }

  function mergeEggs(localRecords, rows, coloursByCollection, locations, employees) {
    const merged = [...(localRecords || [])];
    rows.forEach(row => {
      const existing = merged.find(record =>
        record.supabaseSync?.recordId === row.id ||
        record.id === row.client_reference ||
        record.supabaseSync?.reference === row.reference
      );
      const colours = Object.fromEntries((coloursByCollection.get(row.id) || []).map(item => [item.colour, item.quantity]));
      const remote = {
        id: row.client_reference || row.reference,
        collection: row.collection_name,
        quantity: row.total_quantity,
        colours,
        notes: row.notes || "",
        collectionStartedAt: row.collection_started_at,
        createdAt: row.created_at,
        worker: employees.get(row.submitter_id) || "Estate team",
        supabaseSync: {
          ...(existing?.supabaseSync || {}),
          status: "synced",
          recordId: row.id,
          reference: row.reference,
          locationReference: locations.get(row.location_id)?.reference || "",
          syncedAt: new Date().toISOString(),
          error: null
        }
      };
      if (existing) Object.assign(existing, remote, existing.photo ? { photo: existing.photo } : {});
      else merged.push(remote);
    });
    return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function mergeLivestock(localRecords, rows, locations, groups, employees) {
    const merged = [...(localRecords || [])];
    rows.forEach(row => {
      const existing = merged.find(record =>
        record.supabaseSync?.recordId === row.id ||
        record.clientReference === row.client_reference ||
        record.reference === row.reference
      );
      const remote = {
        clientReference: row.client_reference || existing?.clientReference || "",
        reference: row.reference,
        group: groups.get(row.livestock_group_id)?.name || "Livestock",
        location: locations.get(row.location_id)?.name || "Estate location",
        animalCount: row.animals_observed,
        status: welfareLabels[row.welfare_status] || row.welfare_status,
        observations: row.observations || "",
        followUpDate: row.follow_up_date || "",
        confirmations: Number(row.confirmations?.completed || 0),
        worker: employees.get(row.submitter_id) || "Estate team",
        createdAt: row.created_at,
        supabaseSync: {
          ...(existing?.supabaseSync || {}),
          status: "synced",
          recordId: row.id,
          reference: row.reference,
          groupReference: groups.get(row.livestock_group_id)?.reference || "",
          locationReference: locations.get(row.location_id)?.reference || "",
          welfareStatus: row.welfare_status,
          syncedAt: new Date().toISOString(),
          error: null
        }
      };
      if (existing) Object.assign(existing, remote, existing.photo ? { photo: existing.photo } : {});
      else merged.push(remote);
    });
    return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function mergePreTask(localRecords, rows, departments, employees) {
    const merged = [...(localRecords || [])];
    rows.forEach(row => {
      const existing = merged.find(record =>
        record.supabaseSync?.recordId === row.id ||
        record.clientReference === row.client_reference ||
        record.reference === row.reference
      );
      const completed = Number(row.confirmations?.completed || row.confirmations?.total || 0);
      const remote = {
        clientReference: row.client_reference || existing?.clientReference || "",
        reference: row.reference,
        worker: employees.get(row.employee_id) || "Estate team",
        department: departments.get(row.department_id) || "Heritage Eggs",
        createdAt: row.submitted_at || row.created_at,
        status: row.status === "submitted" ? "Confirmed" : row.status,
        confirmations: completed,
        supabaseSync: {
          ...(existing?.supabaseSync || {}),
          status: "synced",
          recordId: row.id,
          reference: row.reference,
          syncedAt: new Date().toISOString(),
          error: null
        }
      };
      if (existing) Object.assign(existing, remote);
      else merged.push(remote);
    });
    return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function mergeSafetyForms(localRecords, rows, fieldsByRecord, departments, employees) {
    const merged = [...(localRecords || [])];
    rows.forEach(row => {
      const existing = merged.find(record =>
        record.supabaseSync?.recordId === row.id ||
        record.clientReference === row.client_reference ||
        record.reference === row.reference
      );
      const definition = safetyFormTypes[row.form_type] || { type: row.form_type, title: "Safety Record" };
      const fields = Object.fromEntries((fieldsByRecord.get(row.id) || []).map(field => [field.field_key, field.field_value]));
      const createdAt = row.created_at;
      const remote = {
        clientReference: row.client_reference || existing?.clientReference || "",
        assetId: row.asset_id || existing?.assetId || null,
        reference: row.reference,
        type: definition.type,
        title: definition.title,
        worker: employees.get(row.submitter_id) || "Estate team",
        department: departments.get(row.department_id) || "Estate Operations",
        date: String(createdAt || "").slice(0, 10),
        createdAt,
        status: safetyStatuses[row.review_status] || row.review_status,
        data: { ...(existing?.data || {}), ...fields },
        supabaseSync: {
          ...(existing?.supabaseSync || {}),
          status: "synced",
          recordId: row.id,
          reference: row.reference,
          syncedAt: new Date().toISOString(),
          error: null
        }
      };
      if (existing) Object.assign(existing, remote);
      else merged.push(remote);
    });
    return merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  async function refreshJournal() {
    if (refreshRunning || Date.now() < nextRefreshAt) return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;
    refreshRunning = true;
    nextRefreshAt = Date.now() + 10000;
    try {
      const [eggRows, colourRows, livestockRows, preTaskRows, safetyRows, safetyFieldRows, locationRows, groupRows, departmentRows, employeeRows] = await Promise.all([
        window.CCEMSSupabase.select("egg_collections", query("id,reference,client_reference,location_id,collection_name,notes,collection_started_at,total_quantity,submitter_id,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("egg_collection_colours", query("egg_collection_id,colour,quantity")),
        window.CCEMSSupabase.select("livestock_welfare_checks", query("id,reference,client_reference,livestock_group_id,location_id,welfare_status,observations,animals_observed,follow_up_date,confirmations,submitter_id,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("pre_task_safety_records", query("id,reference,client_reference,employee_id,department_id,confirmations,status,submitted_at,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("safety_records", query("id,reference,client_reference,form_type,department_id,submitter_id,asset_id,review_status,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("safety_record_fields", query("safety_record_id,field_key,field_value")),
        window.CCEMSSupabase.select("locations", query("id,reference,name")),
        window.CCEMSSupabase.select("livestock_groups", query("id,reference,name")),
        window.CCEMSSupabase.select("departments", query("id,code,name")),
        window.CCEMSSupabase.select("employees", query("id,preferred_name"))
      ]);
      const coloursByCollection = new Map();
      colourRows.forEach(item => {
        const values = coloursByCollection.get(item.egg_collection_id) || [];
        values.push(item);
        coloursByCollection.set(item.egg_collection_id, values);
      });
      const locations = new Map(locationRows.map(item => [item.id, item]));
      const groups = new Map(groupRows.map(item => [item.id, item]));
      const departments = new Map(departmentRows.map(item => [item.id, item.name || departmentNames[item.code] || item.code]));
      const employees = new Map(employeeRows.map(item => [item.id, item.preferred_name]));
      window.CCEMSAuthorizedEmployees = [...new Set(employeeRows.map(item => item.preferred_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const fieldsByRecord = new Map();
      safetyFieldRows.forEach(item => {
        const values = fieldsByRecord.get(item.safety_record_id) || [];
        values.push(item);
        fieldsByRecord.set(item.safety_record_id, values);
      });
      const saved = state();
      const before = JSON.stringify({ eggs: saved.eggCollections || [], livestock: saved.livestockChecks || [], preTask: saved.preTaskSafety || [], safety: saved.safetyForms || [] });
      saved.eggCollections = mergeEggs(saved.eggCollections, eggRows, coloursByCollection, locations, employees);
      saved.livestockChecks = mergeLivestock(saved.livestockChecks, livestockRows, locations, groups, employees);
      saved.preTaskSafety = mergePreTask(saved.preTaskSafety, preTaskRows, departments, employees);
      saved.safetyForms = mergeSafetyForms(saved.safetyForms, safetyRows, fieldsByRecord, departments, employees);
      const after = JSON.stringify({ eggs: saved.eggCollections, livestock: saved.livestockChecks, preTask: saved.preTaskSafety, safety: saved.safetyForms });
      if (after !== before) {
        save(saved);
        if (["home", "forms", "journal", "journal-detail"].includes(view)) render();
      }
    } catch (error) {
      console.warn("Secure journal refresh is unavailable", error);
    } finally {
      refreshRunning = false;
    }
  }

  window.CCEMSRefreshJournal = function () {
    nextRefreshAt = 0;
    return refreshJournal();
  };

  const previousRender = render;
  render = function () {
    previousRender();
    if (["home", "forms", "journal", "journal-detail"].includes(view)) setTimeout(refreshJournal, 0);
  };
})();
