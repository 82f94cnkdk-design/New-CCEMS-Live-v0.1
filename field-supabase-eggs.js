(function () {
  const locationReferences = ["HE-H01", "HE-H02", "HE-H03", "HE-H04", "HE-H05"];
  let retryRunning = false;

  function syncMarkup(record) {
    if (!record?.supabaseSync) return "";
    if (record.supabaseSync.status === "synced") {
      return `<span class="collection-sync synced"><b>✓</b><span><strong>Saved to Supabase</strong><small>${concernText(record.supabaseSync.reference || "Secure record confirmed")}</small></span></span>`;
    }
    if (record.supabaseSync.status === "syncing") {
      return '<span class="collection-sync syncing"><b>↻</b><span><strong>Saving securely…</strong><small>A browser copy is already retained.</small></span></span>';
    }
    return '<span class="collection-sync pending"><b>!</b><span><strong>Saved on this device</strong><small>Supabase sync will retry when the local service is available.</small></span></span>';
  }

  function payloadFor(record) {
    return {
      p_client_reference: record.id,
      p_location_reference: record.supabaseSync.locationReference,
      p_collection_name: record.collection,
      p_notes: record.notes || "",
      p_collection_started_at: record.collectionStartedAt || record.createdAt,
      p_colours: record.colours
    };
  }

  async function syncRecord(localId) {
    const currentState = state();
    const record = (currentState.eggCollections || []).find(item => item.id === localId);
    if (!record?.supabaseSync || record.supabaseSync.status === "synced") return;
    if (!window.CCEMSSupabase.readSession()?.access_token) return;

    record.supabaseSync.status = "syncing";
    record.supabaseSync.lastAttemptAt = new Date().toISOString();
    save(currentState);
    if (view === "confirm") render();

    try {
      const result = await window.CCEMSSupabase.rpc("submit_egg_collection", payloadFor(record));
      const savedState = state();
      const savedRecord = (savedState.eggCollections || []).find(item => item.id === localId);
      if (!savedRecord) return;
      savedRecord.supabaseSync = {
        ...savedRecord.supabaseSync,
        status: "synced",
        recordId: result?.[0]?.egg_collection_id || null,
        reference: result?.[0]?.egg_collection_reference || "",
        syncedAt: new Date().toISOString(),
        error: null
      };
      save(savedState);
    } catch (error) {
      const savedState = state();
      const savedRecord = (savedState.eggCollections || []).find(item => item.id === localId);
      if (!savedRecord) return;
      savedRecord.supabaseSync.status = "pending";
      savedRecord.supabaseSync.error = error.message || "Supabase unavailable";
      save(savedState);
    }
    if (view === "confirm" || view === "journal") render();
  }

  async function retryPending() {
    if (retryRunning || !window.CCEMSSupabase.readSession()?.access_token) return;
    retryRunning = true;
    try {
      const pendingIds = (state().eggCollections || [])
        .filter(record => record.supabaseSync && record.supabaseSync.status !== "synced")
        .map(record => record.id);
      for (const localId of pendingIds) await syncRecord(localId);
    } finally {
      retryRunning = false;
    }
  }

  const previousSubmitCollection = submitCollection;
  submitCollection = function () {
    if (!total()) return previousSubmitCollection();
    const locationReference = locationReferences[selectedHouse];
    const notes = document.querySelector(".collection-notes textarea")?.value.trim() || "";
    previousSubmitCollection();
    const savedState = state();
    const record = (savedState.eggCollections || []).find(item => item.id === window.lastBatch);
    if (!record) return;
    record.notes = notes;
    record.supabaseSync = {
      status: "pending",
      locationReference,
      lastAttemptAt: null,
      syncedAt: null,
      error: null
    };
    save(savedState);
    syncRecord(record.id);
  };

  const previousConfirmPage = confirm;
  confirm = function () {
    const html = previousConfirmPage();
    const record = (state().eggCollections || []).find(item => item.id === window.lastBatch);
    return record ? html.replace("</article>", `${syncMarkup(record)}</article>`) : html;
  };

  const previousRender = render;
  render = function () {
    previousRender();
    if (["home", "journal", "confirm"].includes(view)) setTimeout(retryPending, 0);
  };
})();
