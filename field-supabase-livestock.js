(function () {
  const groupReferences = {
    "Cattle": "LIV-CATTLE",
    "Sheep": "LIV-SHEEP",
    "Poultry": "LIV-POULTRY",
    "Mixed livestock": "LIV-MIXED"
  };
  const locationReferences = {
    "Jersey Cow Barns": "LIV-CB01",
    "Milking Parlour": "LIV-MP01",
    "Youngstock Barns": "LIV-YB01",
    "Dairy Grazing Paddocks": "LIV-DGP01",
    "Jersey Youngstock Grazing": "LIV-JYG01",
    "Heritage Egg Village": "LIV-HEV01",
    "Heritage Breeding Centre": "LIV-HBC01",
    "Lambing Meadow": "LIV-LM01",
    "Heritage Sheep Fold & Pens": "LIV-SF01",
    "Sheep Nursery Paddocks": "LIV-SNP01",
    "Estate Operations Yard": "EST-OY01",
    "Other livestock area": "LIV-OTHER"
  };
  const statusCodes = {
    "Good — no action required": "good",
    "Monitor — follow-up required": "monitor",
    "Immediate attention required": "urgent"
  };
  let retryRunning = false;

  function payloadFor(record) {
    return {
      p_client_reference: record.clientReference || record.reference,
      p_livestock_group_reference: record.supabaseSync.groupReference,
      p_location_reference: record.supabaseSync.locationReference,
      p_welfare_status: record.supabaseSync.welfareStatus,
      p_observations: record.observations || "",
      p_animals_observed: record.animalCount,
      p_follow_up_date: record.followUpDate || null,
      p_confirmations: { completed: record.confirmations, total: record.confirmations }
    };
  }

  async function syncRecord(clientReference) {
    const currentState = state();
    const record = (currentState.livestockChecks || []).find(item => (item.clientReference || item.reference) === clientReference);
    if (!record?.supabaseSync || record.supabaseSync.status === "synced") return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;
    record.supabaseSync.status = "syncing";
    record.supabaseSync.lastAttemptAt = new Date().toISOString();
    save(currentState);

    try {
      const result = await window.CCEMSSupabase.rpc("submit_livestock_welfare_check", payloadFor(record));
      const savedState = state();
      const savedRecord = (savedState.livestockChecks || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!savedRecord) return;
      savedRecord.reference = result?.[0]?.welfare_check_reference || savedRecord.reference;
      savedRecord.supabaseSync = {
        ...savedRecord.supabaseSync,
        status: "synced",
        recordId: result?.[0]?.welfare_check_id || null,
        reference: result?.[0]?.welfare_check_reference || "",
        syncedAt: new Date().toISOString(),
        error: null
      };
      save(savedState);
    } catch (error) {
      const savedState = state();
      const savedRecord = (savedState.livestockChecks || []).find(item => (item.clientReference || item.reference) === clientReference);
      if (!savedRecord) return;
      savedRecord.supabaseSync.status = "pending";
      savedRecord.supabaseSync.error = error.message || "Supabase unavailable";
      save(savedState);
    }
    if (view === "journal" || view === "journal-detail") render();
  }

  async function retryPending() {
    if (retryRunning || !window.CCEMSSupabase.readSession()?.access_token) return;
    retryRunning = true;
    try {
      const pendingReferences = (state().livestockChecks || [])
        .filter(record => record.supabaseSync && record.supabaseSync.status !== "synced")
        .map(record => record.clientReference || record.reference);
      for (const clientReference of pendingReferences) await syncRecord(clientReference);
    } finally {
      retryRunning = false;
    }
  }

  const previousSubmit = submitLivestockCheck;
  submitLivestockCheck = function (event) {
    const before = (state().livestockChecks || []).length;
    const formData = new FormData(event.currentTarget);
    previousSubmit(event);
    const savedState = state();
    if ((savedState.livestockChecks || []).length <= before) return;
    const record = savedState.livestockChecks[0];
    record.clientReference = record.reference;
    record.supabaseSync = {
      status: "pending",
      groupReference: groupReferences[String(formData.get("group") || "")],
      locationReference: locationReferences[String(formData.get("location") || "")],
      welfareStatus: statusCodes[String(formData.get("status") || "")],
      lastAttemptAt: null,
      syncedAt: null,
      error: null
    };
    save(savedState);
    syncRecord(record.clientReference);
  };

  const previousJournalDetail = journalDetailV48;
  journalDetailV48 = function () {
    const html = previousJournalDetail();
    const record = selectedJournalRecord?.kind === "livestock" ? selectedJournalRecord.raw : null;
    if (!record?.supabaseSync) return html;
    const synced = record.supabaseSync.status === "synced";
    const heading = synced ? "Saved securely to Supabase" : "Saved on this approved device";
    const detail = synced
      ? `Database reference ${concernText(record.supabaseSync.reference || record.reference)}`
      : "Supabase sync will retry when the local service is available.";
    return html.replace(
      "<strong>Securely recorded on this approved device</strong><span>Available to authorised estate management.</span>",
      `<strong>${heading}</strong><span>${detail}</span>`
    );
  };

  const previousRender = render;
  render = function () {
    previousRender();
    if (["home", "journal", "journal-detail"].includes(view)) setTimeout(retryPending, 0);
  };
})();
