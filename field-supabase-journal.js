(function () {
  const welfareLabels = {
    good: "Good — no action required",
    monitor: "Monitor — follow-up required",
    concern: "Immediate attention required",
    urgent: "Immediate attention required"
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

  async function refreshJournal() {
    if (refreshRunning || Date.now() < nextRefreshAt) return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;
    refreshRunning = true;
    nextRefreshAt = Date.now() + 10000;
    try {
      const [eggRows, colourRows, livestockRows, locationRows, groupRows, employeeRows] = await Promise.all([
        window.CCEMSSupabase.select("egg_collections", query("id,reference,client_reference,location_id,collection_name,notes,collection_started_at,total_quantity,submitter_id,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("egg_collection_colours", query("egg_collection_id,colour,quantity")),
        window.CCEMSSupabase.select("livestock_welfare_checks", query("id,reference,client_reference,livestock_group_id,location_id,welfare_status,observations,animals_observed,follow_up_date,confirmations,submitter_id,created_at", { order: "created_at.desc", limit: "200" })),
        window.CCEMSSupabase.select("locations", query("id,reference,name")),
        window.CCEMSSupabase.select("livestock_groups", query("id,reference,name")),
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
      const employees = new Map(employeeRows.map(item => [item.id, item.preferred_name]));
      const saved = state();
      const before = JSON.stringify({ eggs: saved.eggCollections || [], livestock: saved.livestockChecks || [] });
      saved.eggCollections = mergeEggs(saved.eggCollections, eggRows, coloursByCollection, locations, employees);
      saved.livestockChecks = mergeLivestock(saved.livestockChecks, livestockRows, locations, groups, employees);
      const after = JSON.stringify({ eggs: saved.eggCollections, livestock: saved.livestockChecks });
      if (after !== before) {
        save(saved);
        if (["home", "journal", "journal-detail"].includes(view)) render();
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
    if (["home", "journal", "journal-detail"].includes(view)) setTimeout(refreshJournal, 0);
  };
})();
