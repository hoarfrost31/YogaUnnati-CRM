const PROGRAMS_STORAGE_KEY = "yoga-crm-programs";
const BATCHES_STORAGE_KEY = "yoga-crm-batches";
const ACTIVE_BRANCH_STORAGE_KEY = "yoga-crm-active-branch";
const DEFAULT_WHATSAPP_TEMPLATE = `Namaskaram {{name}} 🙏

Reminder for {{program}}

📅 {{date}}
⏰ 6:00 AM - 9:00 AM
(Both sessions are mandatory)

📍 Location: https://maps.app.goo.gl/QuA9esLZXo9YsvJL8

Please note:
• Bring your *yoga mat*
• Come on an *empty stomach*
(4 hrs after a full meal, 2.5 hrs after snacks, 1.5 hrs after beverages)
• Can drink water.
• Avoid water, phone use, or breaks during the session unless necessary
• Wear *comfortable, loose (preferably cotton) clothing*

Kindly arrive *15 minutes early*.

See you there 😊

Pranam,
Nikhil 🙏🏻🌼`;

const programUiState = {
  programs: [],
  batches: [],
  activeTab: "contacts",
  activeBranchId: "all",
  currentProgramBranchId: "",
  editingProgramId: "",
  searchTerm: "",
  activeProgramFormSection: "contacts",
  contactStudentTypeFilter: "all",
  contactStatusFilter: "all",
  selectedContactIds: [],
  batchEditingId: "",
  currentBatchBranchId: "",
  batchSearchTerm: "",
  batchStudentTypeFilter: "all",
  batchStatusFilter: "all",
  selectedBatchContactIds: [],
  remoteLoaded: false,
  isSyncing: false,
};

const programEls = {
  contactsTabBtn: document.getElementById("contactsTabBtn"),
  programsTabBtn: document.getElementById("programsTabBtn"),
  batchesTabBtn: document.getElementById("batchesTabBtn"),
  contactsView: document.getElementById("contactsView"),
  programsView: document.getElementById("programsView"),
  batchesView: document.getElementById("batchesView"),
  addContactBtn: document.getElementById("addContactBtn"),
  addProgramBtn: document.getElementById("addProgramBtn"),
  addBatchBtn: document.getElementById("addBatchBtn"),
  programSearchInput: document.getElementById("programSearchInput"),
  batchSearchInput: document.getElementById("batchSearchInput"),
  programFilterCount: document.getElementById("programFilterCount"),
  batchFilterCount: document.getElementById("batchFilterCount"),
  programsCount: document.getElementById("programsCount"),
  programsUpcoming: document.getElementById("programsUpcoming"),
  programsLinked: document.getElementById("programsLinked"),
  batchesCount: document.getElementById("batchesCount"),
  batchesCapacity: document.getElementById("batchesCapacity"),
  batchesParticipants: document.getElementById("batchesParticipants"),
  programsTableBody: document.getElementById("programsTableBody"),
  batchesTableBody: document.getElementById("batchesTableBody"),
  programModal: document.getElementById("programModal"),
  programModalTitle: document.getElementById("programModalTitle"),
  closeProgramModalBtn: document.getElementById("closeProgramModalBtn"),
  cancelProgramBtn: document.getElementById("cancelProgramBtn"),
  deleteProgramBtn: document.getElementById("deleteProgramBtn"),
  programForm: document.getElementById("programForm"),
  programId: document.getElementById("programId"),
  programName: document.getElementById("programName"),
  programScheduledFor: document.getElementById("programScheduledFor"),
  programContactsSectionTab: document.getElementById("programContactsSectionTab"),
  programNotesSectionTab: document.getElementById("programNotesSectionTab"),
  programWhatsappSectionTab: document.getElementById("programWhatsappSectionTab"),
  programContactsSection: document.getElementById("programContactsSection"),
  programNotesSection: document.getElementById("programNotesSection"),
  programWhatsappSection: document.getElementById("programWhatsappSection"),
  programNotes: document.getElementById("programNotes"),
  programWhatsappTemplate: document.getElementById("programWhatsappTemplate"),
  programStudentTypeFilter: document.getElementById("programStudentTypeFilter"),
  programStatusFilter: document.getElementById("programStatusFilter"),
  programContactsGrid: document.getElementById("programContactsGrid"),
  batchModal: document.getElementById("batchModal"),
  batchModalTitle: document.getElementById("batchModalTitle"),
  closeBatchModalBtn: document.getElementById("closeBatchModalBtn"),
  cancelBatchBtn: document.getElementById("cancelBatchBtn"),
  deleteBatchBtn: document.getElementById("deleteBatchBtn"),
  batchForm: document.getElementById("batchForm"),
  batchId: document.getElementById("batchId"),
  batchName: document.getElementById("batchName"),
  batchStartTime: document.getElementById("batchStartTime"),
  batchEndTime: document.getElementById("batchEndTime"),
  batchCapacity: document.getElementById("batchCapacity"),
  batchParticipantCount: document.getElementById("batchParticipantCount"),
  batchStudentTypeFilter: document.getElementById("batchStudentTypeFilter"),
  batchStatusFilter: document.getElementById("batchStatusFilter"),
  batchContactsGrid: document.getElementById("batchContactsGrid"),
};

function getCRMContacts() {
  return window.crmData?.contacts || [];
}

function getCRMBranches() {
  return window.crmData?.branches || [];
}

function getCRMActiveBranchId() {
  return window.crmData?.activeBranchId || "all";
}

function getPersistedActiveBranchId() {
  try {
    return window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY) || "all";
  } catch {
    return "all";
  }
}

function getInitialActiveBranchId() {
  const crmActiveBranchId = getCRMActiveBranchId();
  return crmActiveBranchId !== "all" ? crmActiveBranchId : getPersistedActiveBranchId();
}

function areCRMBranchesLoaded() {
  return Boolean(window.crmData?.branchesLoaded);
}

function getProgramsApi() {
  return window.crmApi || null;
}

function normalizeProgram(program) {
  if (!program || typeof program !== "object") {
    return null;
  }

  const contactIds = Array.isArray(program.contactIds)
    ? program.contactIds
    : Array.isArray(program.contact_ids)
      ? program.contact_ids
      : [];

  return {
    id: String(program.id || ""),
    branchId: String(program.branchId ?? program.branch_id ?? ""),
    name: String(program.name || "").trim(),
    scheduledFor: program.scheduledFor ?? program.scheduled_for ?? "",
    notes: program.notes ?? "",
    whatsappTemplate: program.whatsappTemplate ?? program.whatsapp_template ?? "",
    contactIds: contactIds
      .map((contactId) => Number(contactId))
      .filter((contactId) => Number.isFinite(contactId)),
    createdAt: program.createdAt ?? program.created_at ?? null,
  };
}

function sortPrograms(programs) {
  return [...programs].sort((left, right) => {
    const leftDate = left.scheduledFor || "9999-12-31";
    const rightDate = right.scheduledFor || "9999-12-31";
    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    const leftCreated = left.createdAt || "";
    const rightCreated = right.createdAt || "";
    return rightCreated.localeCompare(leftCreated);
  });
}

function loadProgramsFromStorage() {
  const api = getProgramsApi();

  try {
    const cachedPrograms = api?.getCachedPrograms?.();
    if (Array.isArray(cachedPrograms)) {
      programUiState.programs = cachedPrograms.map(normalizeProgram).filter(Boolean);
    } else {
      const raw = window.localStorage.getItem(PROGRAMS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      programUiState.programs = Array.isArray(parsed) ? parsed.map(normalizeProgram).filter(Boolean) : [];
    }
  } catch {
    programUiState.programs = [];
  }

  programUiState.programs = sortPrograms(programUiState.programs);
}

function saveProgramsToStorage() {
  const nextPrograms = sortPrograms(programUiState.programs.map(normalizeProgram).filter(Boolean));
  const api = getProgramsApi();

  programUiState.programs = nextPrograms;

  if (api?.setCachedPrograms) {
    api.setCachedPrograms(nextPrograms);
    return;
  }

  window.localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(nextPrograms));
}

function syncProgramsWithCRM({ reloadFromStorage = false } = {}) {
  if (reloadFromStorage) {
    loadProgramsFromStorage();
  }

  if (!Array.isArray(programUiState.programs)) {
    programUiState.programs = [];
  }

  programUiState.programs = sortPrograms(
    programUiState.programs
      .map(normalizeProgram)
      .filter(Boolean),
  );

  const branchIds = new Set(getCRMBranches().map((branch) => String(branch.id)));
  if (branchIds.size) {
    programUiState.programs = programUiState.programs.filter((program) => branchIds.has(String(program.branchId)));
  }

  if (
    areCRMBranchesLoaded()
    && programUiState.activeBranchId !== "all"
    && !branchIds.has(String(programUiState.activeBranchId))
  ) {
    programUiState.activeBranchId = "all";
  }

  if (
    areCRMBranchesLoaded()
    &&
    programUiState.currentProgramBranchId
    && !branchIds.has(String(programUiState.currentProgramBranchId))
    && !programUiState.editingProgramId
  ) {
    programUiState.currentProgramBranchId = "";
  }
}

function removeProgramsByBranch(branchId) {
  const nextPrograms = programUiState.programs.filter((program) => String(program.branchId) !== String(branchId));
  if (nextPrograms.length === programUiState.programs.length) {
    return false;
  }

  programUiState.programs = nextPrograms;
  saveProgramsToStorage();

  if (String(programUiState.currentProgramBranchId) === String(branchId)) {
    closeProgramModal();
  }

  renderProgramsTable();
  return true;
}

function upsertProgramInState(program) {
  const normalizedProgram = normalizeProgram(program);
  if (!normalizedProgram) {
    return null;
  }

  const existingIndex = programUiState.programs.findIndex((item) => String(item.id) === String(normalizedProgram.id));
  if (existingIndex >= 0) {
    programUiState.programs[existingIndex] = normalizedProgram;
  } else {
    programUiState.programs.unshift(normalizedProgram);
  }

  saveProgramsToStorage();
  return normalizedProgram;
}

async function migrateCachedProgramsToSupabase(remotePrograms = []) {
  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    return;
  }

  const branchIds = new Set(getCRMBranches().map((branch) => String(branch.id)));
  const cachedPrograms = programUiState.programs.filter((program) => {
    if (!program?.id || !program?.name || !program?.branchId) {
      return false;
    }

    return !branchIds.size || branchIds.has(String(program.branchId));
  });
  if (!cachedPrograms.length) {
    return;
  }

  const remoteIds = new Set(remotePrograms.map((program) => String(program.id)));
  const pendingPrograms = cachedPrograms.filter((program) => !remoteIds.has(String(program.id)));
  if (!pendingPrograms.length) {
    return;
  }

  for (const program of pendingPrograms) {
    await api.upsertProgram(program);
  }
}

async function fetchProgramsFromSupabase({ migrateCache = true } = {}) {
  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    syncProgramsWithCRM({ reloadFromStorage: true });
    renderProgramsTable();
    return;
  }

  if (programUiState.isSyncing) {
    return;
  }

  programUiState.isSyncing = true;

  try {
    const remotePrograms = (await api.loadPrograms()).map(normalizeProgram).filter(Boolean);
    if (migrateCache) {
      await migrateCachedProgramsToSupabase(remotePrograms);
    }

    const nextPrograms = migrateCache
      ? (await api.loadPrograms()).map(normalizeProgram).filter(Boolean)
      : remotePrograms;

    programUiState.programs = sortPrograms(nextPrograms);
    syncProgramsWithCRM();
    saveProgramsToStorage();
    programUiState.remoteLoaded = true;
    renderProgramsTable();
  } catch (error) {
    api.setStatusMessage?.(`Could not load programs: ${error.message}`, true);
    syncProgramsWithCRM({ reloadFromStorage: true });
    renderProgramsTable();
  } finally {
    programUiState.isSyncing = false;
  }
}

function normalizeBatch(batch) {
  if (!batch || typeof batch !== "object") {
    return null;
  }

  const contactIds = Array.isArray(batch.contactIds)
    ? batch.contactIds
    : Array.isArray(batch.contact_ids)
      ? batch.contact_ids
      : [];

  return {
    id: String(batch.id || ""),
    branchId: String(batch.branchId ?? batch.branch_id ?? ""),
    name: String(batch.name || "").trim(),
    startTime: batch.startTime ?? batch.start_time ?? "",
    endTime: batch.endTime ?? batch.end_time ?? "",
    participantCapacity: Number(batch.participantCapacity ?? batch.participant_capacity ?? 0) || 0,
    participantCount: Number(batch.participantCount ?? batch.participant_count ?? 0) || 0,
    contactIds: contactIds
      .map((contactId) => Number(contactId))
      .filter((contactId) => Number.isFinite(contactId)),
    createdAt: batch.createdAt ?? batch.created_at ?? null,
  };
}

function sortBatches(batches) {
  return [...batches].sort((left, right) => {
    const leftTime = `${left.startTime || ""}-${left.name || ""}`;
    const rightTime = `${right.startTime || ""}-${right.name || ""}`;
    if (leftTime !== rightTime) {
      return leftTime.localeCompare(rightTime);
    }

    const leftCreated = left.createdAt || "";
    const rightCreated = right.createdAt || "";
    return rightCreated.localeCompare(leftCreated);
  });
}

function loadBatchesFromStorage() {
  const api = getProgramsApi();

  try {
    const cachedBatches = api?.getCachedBatches?.();
    if (Array.isArray(cachedBatches)) {
      programUiState.batches = cachedBatches.map(normalizeBatch).filter(Boolean);
    } else {
      const raw = window.localStorage.getItem(BATCHES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      programUiState.batches = Array.isArray(parsed) ? parsed.map(normalizeBatch).filter(Boolean) : [];
    }
  } catch {
    programUiState.batches = [];
  }

  programUiState.batches = sortBatches(programUiState.batches);
}

function saveBatchesToStorage() {
  const nextBatches = sortBatches(programUiState.batches.map(normalizeBatch).filter(Boolean));
  const api = getProgramsApi();

  programUiState.batches = nextBatches;

  if (api?.setCachedBatches) {
    api.setCachedBatches(nextBatches);
    return;
  }

  window.localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(nextBatches));
}

function syncBatchesWithCRM({ reloadFromStorage = false } = {}) {
  if (reloadFromStorage) {
    loadBatchesFromStorage();
  }

  if (!Array.isArray(programUiState.batches)) {
    programUiState.batches = [];
  }

  programUiState.batches = sortBatches(
    programUiState.batches
      .map(normalizeBatch)
      .filter(Boolean),
  );

  const branchIds = new Set(getCRMBranches().map((branch) => String(branch.id)));
  if (branchIds.size) {
    programUiState.batches = programUiState.batches.filter((batch) => branchIds.has(String(batch.branchId)));
  }

  if (
    areCRMBranchesLoaded()
    && programUiState.activeBranchId !== "all"
    && !branchIds.has(String(programUiState.activeBranchId))
  ) {
    programUiState.activeBranchId = "all";
  }

  if (
    areCRMBranchesLoaded()
    && programUiState.currentBatchBranchId
    && !branchIds.has(String(programUiState.currentBatchBranchId))
    && !programUiState.batchEditingId
  ) {
    programUiState.currentBatchBranchId = "";
  }
}

function upsertBatchInState(batch) {
  const normalizedBatch = normalizeBatch(batch);
  if (!normalizedBatch) {
    return null;
  }

  const existingIndex = programUiState.batches.findIndex((item) => String(item.id) === String(normalizedBatch.id));
  if (existingIndex >= 0) {
    programUiState.batches[existingIndex] = normalizedBatch;
  } else {
    programUiState.batches.unshift(normalizedBatch);
  }

  saveBatchesToStorage();
  return normalizedBatch;
}

function removeBatchesByBranch(branchId) {
  const nextBatches = programUiState.batches.filter((batch) => String(batch.branchId) !== String(branchId));
  if (nextBatches.length === programUiState.batches.length) {
    return false;
  }

  programUiState.batches = nextBatches;
  saveBatchesToStorage();

  if (String(programUiState.currentBatchBranchId) === String(branchId)) {
    closeBatchModal();
  }

  renderBatchesTable();
  return true;
}

async function migrateCachedBatchesToSupabase(remoteBatches = []) {
  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    return;
  }

  const branchIds = new Set(getCRMBranches().map((branch) => String(branch.id)));
  const cachedBatches = programUiState.batches.filter((batch) => {
    if (!batch?.id || !batch?.name || !batch?.branchId) {
      return false;
    }

    return !branchIds.size || branchIds.has(String(batch.branchId));
  });
  if (!cachedBatches.length) {
    return;
  }

  const remoteIds = new Set(remoteBatches.map((batch) => String(batch.id)));
  const pendingBatches = cachedBatches.filter((batch) => !remoteIds.has(String(batch.id)));
  if (!pendingBatches.length) {
    return;
  }

  for (const batch of pendingBatches) {
    await api.upsertBatch(batch);
  }
}

async function fetchBatchesFromSupabase({ migrateCache = true } = {}) {
  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    syncBatchesWithCRM({ reloadFromStorage: true });
    renderBatchesTable();
    return;
  }

  try {
    const remoteBatches = (await api.loadBatches()).map(normalizeBatch).filter(Boolean);
    if (migrateCache) {
      await migrateCachedBatchesToSupabase(remoteBatches);
    }

    const nextBatches = migrateCache
      ? (await api.loadBatches()).map(normalizeBatch).filter(Boolean)
      : remoteBatches;

    programUiState.batches = sortBatches(nextBatches);
    syncBatchesWithCRM();
    saveBatchesToStorage();
    renderBatchesTable();
  } catch (error) {
    api.setStatusMessage?.(`Could not load batches: ${error.message}`, true);
    syncBatchesWithCRM({ reloadFromStorage: true });
    renderBatchesTable();
  }
}

function getBranchName(branchId) {
  if (branchId && !areCRMBranchesLoaded()) {
    return "Loading branch...";
  }

  const branch = getCRMBranches().find((item) => String(item.id) === String(branchId));
  return branch?.name || "Unknown Branch";
}

function getContactName(contactId) {
  const contact = getCRMContacts().find((item) => String(item.id) === String(contactId));
  return contact?.name || "Unknown Contact";
}

function getContactById(contactId) {
  return getCRMContacts().find((item) => String(item.id) === String(contactId));
}

function getContactStudentType(contactId) {
  const contact = getContactById(contactId);
  return contact?.student_type || "regular_sessions";
}

function normalizeExplicitInternationalNumber(rawValue, digits) {
  if (!String(rawValue || "").trim().startsWith("+")) {
    return "";
  }

  let normalized = digits;

  // Handle numbers entered like +44(0)7700... or +4407700...
  for (let countryCodeLength = 1; countryCodeLength <= 3; countryCodeLength += 1) {
    const countryCode = normalized.slice(0, countryCodeLength);
    const nationalNumber = normalized.slice(countryCodeLength);

    if (!countryCode || !nationalNumber.startsWith("0")) {
      continue;
    }

    const withoutTrunkZero = `${countryCode}${nationalNumber.slice(1)}`;
    if (withoutTrunkZero.length >= 8 && withoutTrunkZero.length <= 15) {
      normalized = withoutTrunkZero;
      break;
    }
  }

  return normalized.length >= 8 && normalized.length <= 15 ? normalized : "";
}

function normalizePhoneNumber(phone) {
  const rawValue = String(phone || "").trim();
  let digits = rawValue.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.startsWith("00") && digits.length > 4) {
    digits = digits.slice(2);
  }

  const explicitInternational = normalizeExplicitInternationalNumber(rawValue, digits);
  if (explicitInternational) {
    return explicitInternational;
  }

  // Preserve likely international numbers instead of forcing them into India format.
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("0") && !digits.startsWith("91")) {
    return digits;
  }

  let normalized = digits;

  if (normalized.length > 10 && normalized.startsWith("0")) {
    normalized = normalized.replace(/^0+/, "");
  }

  if (normalized.length > 10 && normalized.startsWith("91")) {
    normalized = normalized.replace(/^91+/, "");
  }

  if (normalized.length === 10) {
    return `91${normalized}`;
  }

  if (normalized.length === 12 && normalized.startsWith("91")) {
    return normalized;
  }

  return normalized;
}

function parsePhoneNumbers(value = "") {
  return String(value)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getNormalizedPhoneOptions(phoneValue) {
  return parsePhoneNumbers(phoneValue)
    .map((rawPhone) => ({
      rawPhone,
      normalizedPhone: normalizePhoneNumber(rawPhone),
    }))
    .filter((phone) => phone.normalizedPhone);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildProgramWhatsappMessage(program, contactName) {
  const template = program.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  return template
    .replaceAll("{{name}}", contactName)
    .replaceAll("{{program}}", program.name || "")
    .replaceAll("{{date}}", program.scheduledFor || "")
    .replaceAll("{{branch}}", getBranchName(program.branchId))
    .replaceAll("{{date_sentence}}", program.scheduledFor ? ` on ${program.scheduledFor}` : "");
}

function openWhatsappLauncher(program, contacts) {
  const launcher = window.open("", "_blank", "width=720,height=760");
  if (!launcher) {
    window.alert("Popup blocked. Please allow popups for this page.");
    return;
  }

  try {
    launcher.opener = null;
  } catch {}

  const rows = contacts.map((contact) => {
    const message = buildProgramWhatsappMessage(program, contact.name);
    const sendButtons = contact.phoneOptions.map((phoneOption, index) => {
      const whatsappUrl = new URL("https://api.whatsapp.com/send");
      whatsappUrl.searchParams.set("phone", phoneOption.normalizedPhone);
      whatsappUrl.searchParams.set("text", message);

      return `
        <a
          href="${escapeHtml(whatsappUrl.toString())}"
          target="_blank"
          rel="noopener noreferrer"
          data-whatsapp-link
          data-phone="${escapeHtml(phoneOption.normalizedPhone)}"
          style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:999px;background:#dc7c43;color:#ffffff;text-decoration:none;font:700 14px Manrope,sans-serif;box-shadow:0 10px 20px rgba(200,106,49,0.18);"
        >
          Send WhatsApp${contact.phoneOptions.length > 1 ? ` ${index + 1}` : ""}
        </a>
      `;
    }).join("");

    return `
      <article style="border:1px solid #e6d9cc;border-radius:16px;padding:16px;background:#fffaf4;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong style="display:block;font:700 16px Manrope,sans-serif;color:#241d18;">${escapeHtml(contact.name)}</strong>
            ${contact.phoneOptions.map((phoneOption) => `
              <span style="display:block;margin-top:6px;font:500 14px Manrope,sans-serif;color:#6b6158;">${escapeHtml(phoneOption.rawPhone)}</span>
            `).join("")}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${sendButtons}
            <button type="button" data-toggle-editor style="border:none;min-height:42px;padding:0 16px;border-radius:999px;background:#ece5dc;color:#241d18;font:700 14px Manrope,sans-serif;cursor:pointer;">Edit Message</button>
          </div>
        </div>
        <div data-editor-panel hidden style="margin-top:14px;padding-top:14px;border-top:1px solid #eadfd4;">
          <label style="display:block;">
            <span style="display:block;margin-bottom:8px;font:800 12px Manrope,sans-serif;color:#6b6158;letter-spacing:0.12em;text-transform:uppercase;">Message</span>
            <textarea data-message-editor rows="6" style="width:100%;padding:14px 16px;border:1px solid rgba(36,29,24,0.12);border-radius:16px;background:#fffdfa;color:#241d18;font:500 14px/1.6 Manrope,sans-serif;resize:vertical;box-sizing:border-box;outline:none;">${escapeHtml(message)}</textarea>
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
            <button type="button" data-copy-button style="border:none;min-height:42px;padding:0 16px;border-radius:999px;background:#ece5dc;color:#241d18;font:700 14px Manrope,sans-serif;cursor:pointer;">Copy Message</button>
            <button type="button" data-reset-message="${escapeHtml(encodeURIComponent(message))}" style="border:none;min-height:42px;padding:0 16px;border-radius:999px;background:#ece5dc;color:#241d18;font:700 14px Manrope,sans-serif;cursor:pointer;">Reset</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  launcher.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(program.name)} WhatsApp Launcher</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    </head>
    <body style="margin:0;min-height:100vh;background:linear-gradient(180deg,#fbf8f4 0%,#f2eee8 100%);color:#241d18;font-family:Manrope,sans-serif;">
      <main style="width:min(100%,1180px);margin:0 auto;padding:32px 16px 40px;">
        <header style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:20px;padding:20px 22px;border-radius:24px;background:linear-gradient(180deg,#fffdfa 0%,#fff9f4 100%);border:1px solid rgba(36,29,24,0.12);box-shadow:0 12px 28px rgba(36,29,24,0.08);">
          <div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:46px;height:46px;flex:0 0 auto;">
                <img src="logo.png" alt="YogaUnnati logo" style="width:100%;height:100%;object-fit:contain;display:block;">
              </div>
              <div>
                <p style="margin:0 0 6px;color:#dc7c43;font:800 11px Manrope,sans-serif;letter-spacing:0.12em;text-transform:uppercase;">YogaUnnati CRM</p>
                <h1 style="margin:0;font:700 26px Fraunces,serif;letter-spacing:-0.04em;">${escapeHtml(program.name)}</h1>
              </div>
            </div>
            <p style="margin:12px 0 0;max-width:700px;color:#655c55;font:500 15px/1.7 Manrope,sans-serif;">Review each linked contact, adjust the message if needed, and send WhatsApp from one tidy workspace.</p>
          </div>
          <div style="min-width:180px;padding:16px 18px;border-radius:20px;background:#fff4ec;border:1px solid #f0d8c9;">
            <span style="display:block;font:800 12px Manrope,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:#966028;">Participant Count</span>
            <strong style="display:block;margin-top:10px;font:800 28px Manrope,sans-serif;color:#241d18;">${contacts.length}</strong>
          </div>
        </header>
        <section style="background:#fffbf7;border:1px solid rgba(36,29,24,0.12);border-radius:24px;padding:22px 22px 24px;box-shadow:0 12px 28px rgba(36,29,24,0.08);">
          <div style="display:grid;gap:14px;">
            ${rows}
          </div>
        </section>
      </main>
      <script>
        document.addEventListener("click", async (event) => {
          const toggleButton = event.target.closest("[data-toggle-editor]");
          if (toggleButton) {
            const article = toggleButton.closest("article");
            const panel = article.querySelector("[data-editor-panel]");
            const isHidden = panel.hasAttribute("hidden");
            if (isHidden) {
              panel.removeAttribute("hidden");
              toggleButton.textContent = "Done";
            } else {
              panel.setAttribute("hidden", "");
              toggleButton.textContent = "Edit Message";
            }
            return;
          }

          const copyButton = event.target.closest("[data-copy-button]");
          if (copyButton) {
            const article = copyButton.closest("article");
            const editor = article.querySelector("[data-message-editor]");
            try {
              await navigator.clipboard.writeText(editor.value);
              copyButton.textContent = "Copied";
              setTimeout(() => { copyButton.textContent = "Copy Message"; }, 1200);
            } catch {
              copyButton.textContent = "Copy failed";
            }
            return;
          }

          const resetButton = event.target.closest("[data-reset-message]");
          if (resetButton) {
            const article = resetButton.closest("article");
            const editor = article.querySelector("[data-message-editor]");
            editor.value = decodeURIComponent(resetButton.getAttribute("data-reset-message"));
            article.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
              link.href = buildWhatsappUrl(link.dataset.phone, editor.value);
            });
            return;
          }
        });

        document.addEventListener("input", (event) => {
          const editor = event.target.closest("[data-message-editor]");
          if (!editor) return;
          const article = editor.closest("article");
          article.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
            link.href = buildWhatsappUrl(link.dataset.phone, editor.value);
          });
        });

        function buildWhatsappUrl(phone, text) {
          const url = new URL("https://api.whatsapp.com/send");
          url.searchParams.set("phone", phone);
          url.searchParams.set("text", text);
          return url.toString();
        }

        document.addEventListener("click", (event) => {
          const link = event.target.closest("[data-whatsapp-link]");
          if (!link) {
            return;
          }
        });
      </script>
    </body>
    </html>
  `);
  launcher.document.close();
}

function openWhatsappForProgram(program) {
  const linkedContacts = (program.contactIds || [])
    .map((contactId) => getContactById(contactId))
    .filter(Boolean);

  if (!linkedContacts.length) {
    window.alert("No contacts are linked to this program yet.");
    return;
  }

  const validContacts = linkedContacts
    .map((contact) => {
      const phoneOptions = getNormalizedPhoneOptions(contact.phone);
      if (!phoneOptions.length) {
        return null;
      }

      return {
        ...contact,
        phoneOptions,
      };
    })
    .filter(Boolean);

  if (!validContacts.length) {
    window.alert("Linked contacts do not have valid phone numbers yet.");
    return;
  }

  openWhatsappLauncher(program, validContacts);
}

function setProgramTab(tabName) {
  programUiState.activeTab = tabName;
  programEls.contactsTabBtn.classList.toggle("active", tabName === "contacts");
  programEls.programsTabBtn.classList.toggle("active", tabName === "programs");
  programEls.batchesTabBtn.classList.toggle("active", tabName === "batches");
  programEls.contactsView.classList.toggle("hidden", tabName !== "contacts");
  programEls.programsView.classList.toggle("hidden", tabName !== "programs");
  programEls.batchesView.classList.toggle("hidden", tabName !== "batches");
  programEls.addContactBtn.classList.toggle("hidden", tabName !== "contacts");
  programEls.addProgramBtn.classList.toggle("hidden", tabName !== "programs");
  programEls.addBatchBtn.classList.toggle("hidden", tabName !== "batches");
}

window.switchCRMTab = setProgramTab;

function renderProgramBranchOptions() {
  return getCRMBranches();
}

function getFilteredPrograms() {
  return programUiState.programs.filter((program) => {
    const matchesBranch =
      programUiState.activeBranchId === "all" || String(program.branchId) === String(programUiState.activeBranchId);

    if (!matchesBranch) {
      return false;
    }

    if (!programUiState.searchTerm) {
      return true;
    }

    const haystack = [
      program.name,
      program.notes,
      getBranchName(program.branchId),
      ...(program.contactIds || []).map((contactId) => getContactName(contactId)),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(programUiState.searchTerm);
  });
}

function renderProgramSummary() {
  const scopedPrograms = programUiState.activeBranchId === "all"
    ? programUiState.programs
    : programUiState.programs.filter((program) => String(program.branchId) === String(programUiState.activeBranchId));

  const upcoming = scopedPrograms.filter((program) => program.scheduledFor && program.scheduledFor >= new Date().toISOString().slice(0, 10)).length;
  const linked = scopedPrograms.reduce((sum, program) => sum + (program.contactIds?.length || 0), 0);

  programEls.programsCount.textContent = String(scopedPrograms.length);
  programEls.programsUpcoming.textContent = String(upcoming);
  programEls.programsLinked.textContent = String(linked);
}

function renderProgramContactsChecklist(branchId, selectedIds = []) {
  if (!branchId) {
    programEls.programContactsGrid.innerHTML = '<p class="helper-text">Select a branch first to see matching contacts.</p>';
    return;
  }

  const contacts = getCRMContacts().filter((contact) => {
    const matchesBranch = String(contact.branch_id) === String(branchId);
    const matchesStudentType =
      programUiState.contactStudentTypeFilter === "all" ||
      contact.student_type === programUiState.contactStudentTypeFilter;
    const matchesStatus =
      programUiState.contactStatusFilter === "all" ||
      contact.status === programUiState.contactStatusFilter;

    return matchesBranch && matchesStudentType && matchesStatus;
  });

  if (!contacts.length) {
    programEls.programContactsGrid.innerHTML = '<p class="helper-text">No contacts found for this branch and active filters yet.</p>';
    return;
  }

  const selected = new Set(selectedIds.map(String));
  programEls.programContactsGrid.innerHTML = contacts.map((contact) => `
    <label class="program-check">
      <input type="checkbox" value="${contact.id}" ${selected.has(String(contact.id)) ? "checked" : ""}>
      <span>${contact.name}</span>
    </label>
  `).join("");
}

function renderProgramsTable() {
  syncProgramsWithCRM();
  const programs = getFilteredPrograms();
  const scopedPrograms = programUiState.activeBranchId === "all"
    ? programUiState.programs
    : programUiState.programs.filter((program) => String(program.branchId) === String(programUiState.activeBranchId));

  programEls.programFilterCount.textContent = `Showing ${programs.length} of ${scopedPrograms.length} programs`;

  if (!programs.length) {
    programEls.programsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">No programs found for this branch or search.</td>
      </tr>
    `;
    renderProgramSummary();
    return;
  }

  programEls.programsTableBody.innerHTML = programs.map((program) => {
    const linkedContacts = (program.contactIds || []).length
      ? program.contactIds.map((contactId) => {
        const studentType = getContactStudentType(contactId);
        return `<button class="program-pill program-pill-${escapeHtml(studentType)}" type="button" data-program-contact-id="${contactId}">${escapeHtml(getContactName(contactId))}</button>`;
      }).join("")
      : '<span class="muted-text">No contacts linked</span>';

    return `
      <tr>
        <td><strong>${program.name}</strong></td>
        <td>${getBranchName(program.branchId)}</td>
        <td>${program.scheduledFor || "-"}</td>
        <td class="programs-cell">${linkedContacts}</td>
        <td class="note-cell program-note-cell">${program.notes || "-"}</td>
        <td class="actions-cell program-actions-cell">
          <div class="actions-group">
            <button class="table-action" type="button" data-program-action="whatsapp" data-id="${program.id}">WhatsApp All</button>
            <button class="table-action" type="button" data-program-action="edit" data-id="${program.id}">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderProgramSummary();
}

function setProgramFormSection(sectionName) {
  programUiState.activeProgramFormSection = sectionName;
  const isContacts = sectionName === "contacts";
  const isNotes = sectionName === "notes";
  const isWhatsapp = sectionName === "whatsapp";
  programEls.programContactsSectionTab.classList.toggle("active", isContacts);
  programEls.programNotesSectionTab.classList.toggle("active", isNotes);
  programEls.programWhatsappSectionTab.classList.toggle("active", isWhatsapp);
  programEls.programContactsSection.classList.toggle("hidden", !isContacts);
  programEls.programNotesSection.classList.toggle("hidden", !isNotes);
  programEls.programWhatsappSection.classList.toggle("hidden", !isWhatsapp);
}

function resetProgramForm() {
  programEls.programForm.reset();
  programEls.programId.value = "";
  programEls.deleteProgramBtn.classList.add("hidden");
  programEls.deleteProgramBtn.dataset.programId = "";
  programUiState.editingProgramId = "";
  programUiState.currentProgramBranchId = programUiState.activeBranchId === "all" ? "" : String(programUiState.activeBranchId);
  programEls.programModalTitle.textContent = "Add Program";
  programEls.programWhatsappTemplate.value = DEFAULT_WHATSAPP_TEMPLATE;
  programUiState.contactStudentTypeFilter = "all";
  programUiState.contactStatusFilter = "all";
  programUiState.selectedContactIds = [];
  programEls.programStudentTypeFilter.value = "all";
  programEls.programStatusFilter.value = "all";
  setProgramFormSection("contacts");
  renderProgramContactsChecklist(programUiState.currentProgramBranchId, programUiState.selectedContactIds);
}

function openProgramModal(program = null) {
  resetProgramForm();

  if (program) {
    programEls.programModalTitle.textContent = "Edit Program";
    programEls.programId.value = program.id;
    programEls.deleteProgramBtn.classList.remove("hidden");
    programEls.deleteProgramBtn.dataset.programId = String(program.id);
    programUiState.editingProgramId = String(program.id);
    programUiState.currentProgramBranchId = String(program.branchId || "");
    programEls.programName.value = program.name || "";
    programEls.programScheduledFor.value = program.scheduledFor || "";
    programEls.programNotes.value = program.notes || "";
    programEls.programWhatsappTemplate.value = program.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;
    programUiState.selectedContactIds = [...(program.contactIds || [])];
    renderProgramContactsChecklist(programUiState.currentProgramBranchId, programUiState.selectedContactIds);
  }

  programEls.programModal.classList.remove("hidden");
  programEls.programModal.setAttribute("aria-hidden", "false");
}

function closeProgramModal() {
  programEls.programModal.classList.add("hidden");
  programEls.programModal.setAttribute("aria-hidden", "true");
  resetProgramForm();
}

function syncSelectedContactsFromVisibleInputs() {
  const visibleInputs = Array.from(programEls.programContactsGrid.querySelectorAll("input[type='checkbox']"));
  const visibleIds = new Set(visibleInputs.map((input) => String(input.value)));
  const selectedSet = new Set(programUiState.selectedContactIds.map(String));

  visibleInputs.forEach((input) => {
    if (input.checked) {
      selectedSet.add(String(input.value));
    } else {
      selectedSet.delete(String(input.value));
    }
  });

  programUiState.selectedContactIds = Array.from(selectedSet)
    .filter((id) => !visibleIds.has(id) || selectedSet.has(id))
    .map((id) => Number(id));
}

async function saveProgram(event) {
  event.preventDefault();
  const isEditing = Boolean(programUiState.editingProgramId || programEls.programId.value);

  const payload = {
    id: programUiState.editingProgramId || programEls.programId.value || String(Date.now()),
    branchId: programUiState.currentProgramBranchId,
    name: programEls.programName.value.trim(),
    scheduledFor: programEls.programScheduledFor.value || "",
    notes: programEls.programNotes.value.trim(),
    whatsappTemplate: programEls.programWhatsappTemplate.value.trim() || DEFAULT_WHATSAPP_TEMPLATE,
    contactIds: [...programUiState.selectedContactIds],
  };

  if (!payload.branchId) {
    window.alert("Choose a branch from the top dropdown before saving this program.");
    return;
  }

  if (!payload.name) {
    return;
  }

  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    window.alert("Supabase is not configured yet. Programs now save to Supabase, with local storage used only as cache.");
    return;
  }

  try {
    api.setStatusMessage?.(isEditing ? "Updating program..." : "Saving program...");
    const savedProgram = await api.upsertProgram(payload);
    upsertProgramInState(savedProgram);
    closeProgramModal();
    renderProgramsTable();
    api.setStatusMessage?.(isEditing ? "Program updated." : "Program added.");
  } catch (error) {
    api.setStatusMessage?.(`Program save failed: ${error.message}`, true);
    window.alert(`Program save failed: ${error.message}`);
  }
}

async function deleteCurrentProgram(event) {
  event?.preventDefault();
  event?.stopPropagation();

  const programId =
    programUiState.editingProgramId
    || programEls.deleteProgramBtn.dataset.programId
    || programEls.programId.value;
  if (!programId) {
    window.alert("Unable to find this program. Please close the popup and try again.");
    return;
  }

  const program = programUiState.programs.find((item) => String(item.id) === String(programId));
  if (!program) {
    closeProgramModal();
    renderProgramsTable();
    window.alert("This program was already removed.");
    return;
  }

  if (!window.confirm(`Delete program "${program.name}"?`)) {
    return;
  }

  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    window.alert("Supabase is not configured yet. Programs now delete from Supabase, with local storage used only as cache.");
    return;
  }

  try {
    api.setStatusMessage?.("Deleting program...");
    await api.deleteProgram(program.id);
    programUiState.programs = programUiState.programs.filter((item) => String(item.id) !== String(program.id));
    saveProgramsToStorage();
    closeProgramModal();
    renderProgramsTable();
    api.setStatusMessage?.("Program deleted.");
  } catch (error) {
    api.setStatusMessage?.(`Program delete failed: ${error.message}`, true);
    window.alert(`Program delete failed: ${error.message}`);
  }
}

function handleProgramTableActions(event) {
  const contactButton = event.target.closest("[data-program-contact-id]");
  if (contactButton) {
    const contactId = contactButton.dataset.programContactId;
    window.crmActions?.openContact?.(contactId);
    return;
  }

  const actionButton = event.target.closest("[data-program-action]");
  if (!actionButton) {
    return;
  }

  const program = programUiState.programs.find((item) => String(item.id) === String(actionButton.dataset.id));
  if (!program) {
    return;
  }

  if (actionButton.dataset.programAction === "edit") {
    openProgramModal(program);
    return;
  }

  if (actionButton.dataset.programAction === "whatsapp") {
    openWhatsappForProgram(program);
    return;
  }
}

function formatBatchTime(batch) {
  if (!batch.startTime && !batch.endTime) {
    return "-";
  }

  if (!batch.startTime) {
    return `Until ${batch.endTime}`;
  }

  if (!batch.endTime) {
    return batch.startTime;
  }

  return `${batch.startTime} - ${batch.endTime}`;
}

function getFilteredBatches() {
  return programUiState.batches.filter((batch) => {
    const matchesBranch =
      programUiState.activeBranchId === "all" || String(batch.branchId) === String(programUiState.activeBranchId);

    if (!matchesBranch) {
      return false;
    }

    if (!programUiState.batchSearchTerm) {
      return true;
    }

    const haystack = [
      batch.name,
      formatBatchTime(batch),
      getBranchName(batch.branchId),
      ...(batch.contactIds || []).map((contactId) => getContactName(contactId)),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(programUiState.batchSearchTerm);
  });
}

function renderBatchSummary() {
  const scopedBatches = programUiState.activeBranchId === "all"
    ? programUiState.batches
    : programUiState.batches.filter((batch) => String(batch.branchId) === String(programUiState.activeBranchId));

  const totalCapacity = scopedBatches.reduce((sum, batch) => sum + (Number(batch.participantCapacity) || 0), 0);
  const totalParticipants = scopedBatches.reduce((sum, batch) => sum + (Number(batch.participantCount) || 0), 0);

  programEls.batchesCount.textContent = String(scopedBatches.length);
  programEls.batchesCapacity.textContent = String(totalCapacity);
  programEls.batchesParticipants.textContent = String(totalParticipants);
}

function renderBatchContactsChecklist(branchId, selectedIds = []) {
  if (!branchId) {
    programEls.batchContactsGrid.innerHTML = '<p class="helper-text">Select a branch first to see matching contacts.</p>';
    return;
  }

  const contacts = getCRMContacts().filter((contact) => {
    const matchesBranch = String(contact.branch_id) === String(branchId);
    const matchesStudentType =
      programUiState.batchStudentTypeFilter === "all" ||
      contact.student_type === programUiState.batchStudentTypeFilter;
    const matchesStatus =
      programUiState.batchStatusFilter === "all" ||
      contact.status === programUiState.batchStatusFilter;

    return matchesBranch && matchesStudentType && matchesStatus;
  });

  if (!contacts.length) {
    programEls.batchContactsGrid.innerHTML = '<p class="helper-text">No contacts found for this branch and active filters yet.</p>';
    return;
  }

  const selected = new Set(selectedIds.map(String));
  programEls.batchContactsGrid.innerHTML = contacts.map((contact) => `
    <label class="program-check">
      <input type="checkbox" value="${contact.id}" ${selected.has(String(contact.id)) ? "checked" : ""}>
      <span>${contact.name}</span>
    </label>
  `).join("");
}

function renderBatchesTable() {
  syncBatchesWithCRM();
  const batches = getFilteredBatches();
  const scopedBatches = programUiState.activeBranchId === "all"
    ? programUiState.batches
    : programUiState.batches.filter((batch) => String(batch.branchId) === String(programUiState.activeBranchId));

  programEls.batchFilterCount.textContent = `Showing ${batches.length} of ${scopedBatches.length} batches`;

  if (!batches.length) {
    programEls.batchesTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-cell">No batches found for this branch or search.</td>
      </tr>
    `;
    renderBatchSummary();
    return;
  }

  programEls.batchesTableBody.innerHTML = batches.map((batch) => {
    const linkedContacts = (batch.contactIds || []).length
      ? batch.contactIds.map((contactId) => {
        const studentType = getContactStudentType(contactId);
        return `<button class="program-pill program-pill-${escapeHtml(studentType)}" type="button" data-batch-contact-id="${contactId}">${escapeHtml(getContactName(contactId))}</button>`;
      }).join("")
      : '<span class="muted-text">No contacts linked</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(batch.name)}</strong></td>
        <td>${getBranchName(batch.branchId)}</td>
        <td>${escapeHtml(formatBatchTime(batch))}</td>
        <td>${escapeHtml(String(batch.participantCapacity || 0))}</td>
        <td>${escapeHtml(String(batch.participantCount || 0))}</td>
        <td class="programs-cell">${linkedContacts}</td>
        <td class="actions-cell program-actions-cell">
          <div class="actions-group">
            <button class="table-action" type="button" data-batch-action="edit" data-id="${batch.id}">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderBatchSummary();
}

function resetBatchForm() {
  programEls.batchForm.reset();
  programEls.batchId.value = "";
  programEls.deleteBatchBtn.classList.add("hidden");
  programEls.deleteBatchBtn.dataset.batchId = "";
  programUiState.batchEditingId = "";
  programUiState.currentBatchBranchId = programUiState.activeBranchId === "all" ? "" : String(programUiState.activeBranchId);
  programUiState.batchStudentTypeFilter = "all";
  programUiState.batchStatusFilter = "all";
  programUiState.selectedBatchContactIds = [];
  programEls.batchStudentTypeFilter.value = "all";
  programEls.batchStatusFilter.value = "all";
  programEls.batchModalTitle.textContent = "Add Batch";
  renderBatchContactsChecklist(programUiState.currentBatchBranchId, programUiState.selectedBatchContactIds);
}

function openBatchModal(batch = null) {
  resetBatchForm();

  if (batch) {
    programEls.batchModalTitle.textContent = "Edit Batch";
    programEls.batchId.value = batch.id;
    programEls.deleteBatchBtn.classList.remove("hidden");
    programEls.deleteBatchBtn.dataset.batchId = String(batch.id);
    programUiState.batchEditingId = String(batch.id);
    programUiState.currentBatchBranchId = String(batch.branchId || "");
    programEls.batchName.value = batch.name || "";
    programEls.batchStartTime.value = batch.startTime || "";
    programEls.batchEndTime.value = batch.endTime || "";
    programEls.batchCapacity.value = String(batch.participantCapacity || 0);
    programEls.batchParticipantCount.value = String(batch.participantCount || 0);
    programUiState.selectedBatchContactIds = [...(batch.contactIds || [])];
    renderBatchContactsChecklist(programUiState.currentBatchBranchId, programUiState.selectedBatchContactIds);
  }

  programEls.batchModal.classList.remove("hidden");
  programEls.batchModal.setAttribute("aria-hidden", "false");
}

function closeBatchModal() {
  programEls.batchModal.classList.add("hidden");
  programEls.batchModal.setAttribute("aria-hidden", "true");
  resetBatchForm();
}

function syncSelectedBatchContactsFromVisibleInputs() {
  const visibleInputs = Array.from(programEls.batchContactsGrid.querySelectorAll("input[type='checkbox']"));
  const visibleIds = new Set(visibleInputs.map((input) => String(input.value)));
  const selectedSet = new Set(programUiState.selectedBatchContactIds.map(String));

  visibleInputs.forEach((input) => {
    if (input.checked) {
      selectedSet.add(String(input.value));
    } else {
      selectedSet.delete(String(input.value));
    }
  });

  programUiState.selectedBatchContactIds = Array.from(selectedSet)
    .filter((id) => !visibleIds.has(id) || selectedSet.has(id))
    .map((id) => Number(id));
}

async function saveBatch(event) {
  event.preventDefault();
  const isEditing = Boolean(programUiState.batchEditingId || programEls.batchId.value);

  const payload = {
    id: programUiState.batchEditingId || programEls.batchId.value || String(Date.now()),
    branchId: programUiState.currentBatchBranchId,
    name: programEls.batchName.value.trim(),
    startTime: programEls.batchStartTime.value || "",
    endTime: programEls.batchEndTime.value || "",
    participantCapacity: Number(programEls.batchCapacity.value) || 0,
    participantCount: Number(programEls.batchParticipantCount.value) || 0,
    contactIds: [...programUiState.selectedBatchContactIds],
  };

  if (!payload.branchId) {
    window.alert("Choose a branch from the top dropdown before saving this batch.");
    return;
  }

  if (!payload.name || !payload.startTime || !payload.endTime || !payload.participantCapacity) {
    return;
  }

  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    window.alert("Supabase is not configured yet. Batches now save to Supabase, with local storage used only as cache.");
    return;
  }

  try {
    api.setStatusMessage?.(isEditing ? "Updating batch..." : "Saving batch...");
    const savedBatch = await api.upsertBatch(payload);
    upsertBatchInState(savedBatch);
    closeBatchModal();
    renderBatchesTable();
    api.setStatusMessage?.(isEditing ? "Batch updated." : "Batch added.");
  } catch (error) {
    api.setStatusMessage?.(`Batch save failed: ${error.message}`, true);
    window.alert(`Batch save failed: ${error.message}`);
  }
}

async function deleteCurrentBatch(event) {
  event?.preventDefault();
  event?.stopPropagation();

  const batchId =
    programUiState.batchEditingId
    || programEls.deleteBatchBtn.dataset.batchId
    || programEls.batchId.value;
  if (!batchId) {
    window.alert("Unable to find this batch. Please close the popup and try again.");
    return;
  }

  const batch = programUiState.batches.find((item) => String(item.id) === String(batchId));
  if (!batch) {
    closeBatchModal();
    renderBatchesTable();
    window.alert("This batch was already removed.");
    return;
  }

  if (!window.confirm(`Delete batch "${batch.name}"?`)) {
    return;
  }

  const api = getProgramsApi();
  if (!api?.isSupabaseReady?.()) {
    window.alert("Supabase is not configured yet. Batches now delete from Supabase, with local storage used only as cache.");
    return;
  }

  try {
    api.setStatusMessage?.("Deleting batch...");
    await api.deleteBatch(batch.id);
    programUiState.batches = programUiState.batches.filter((item) => String(item.id) !== String(batch.id));
    saveBatchesToStorage();
    closeBatchModal();
    renderBatchesTable();
    api.setStatusMessage?.("Batch deleted.");
  } catch (error) {
    api.setStatusMessage?.(`Batch delete failed: ${error.message}`, true);
    window.alert(`Batch delete failed: ${error.message}`);
  }
}

function handleBatchTableActions(event) {
  const contactButton = event.target.closest("[data-batch-contact-id]");
  if (contactButton) {
    const contactId = contactButton.dataset.batchContactId;
    window.crmActions?.openContact?.(contactId);
    return;
  }

  const actionButton = event.target.closest("[data-batch-action]");
  if (!actionButton) {
    return;
  }

  const batch = programUiState.batches.find((item) => String(item.id) === String(actionButton.dataset.id));
  if (!batch) {
    return;
  }

  if (actionButton.dataset.batchAction === "edit") {
    openBatchModal(batch);
  }
}

function bindProgramEvents() {
  programEls.contactsTabBtn.addEventListener("click", () => setProgramTab("contacts"));
  programEls.programsTabBtn.addEventListener("click", () => setProgramTab("programs"));
  programEls.batchesTabBtn.addEventListener("click", () => setProgramTab("batches"));
  programEls.addProgramBtn.addEventListener("click", () => openProgramModal());
  programEls.addBatchBtn.addEventListener("click", () => openBatchModal());
  programEls.programForm.addEventListener("submit", saveProgram);
  programEls.batchForm.addEventListener("submit", saveBatch);
  programEls.cancelProgramBtn.addEventListener("click", closeProgramModal);
  programEls.cancelBatchBtn.addEventListener("click", closeBatchModal);
  programEls.deleteProgramBtn.addEventListener("click", deleteCurrentProgram);
  programEls.deleteBatchBtn.addEventListener("click", deleteCurrentBatch);
  programEls.closeProgramModalBtn.addEventListener("click", closeProgramModal);
  programEls.closeBatchModalBtn.addEventListener("click", closeBatchModal);
  programEls.programContactsSectionTab.addEventListener("click", () => setProgramFormSection("contacts"));
  programEls.programNotesSectionTab.addEventListener("click", () => setProgramFormSection("notes"));
  programEls.programWhatsappSectionTab.addEventListener("click", () => setProgramFormSection("whatsapp"));

  programEls.programModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) {
      closeProgramModal();
    }
  });

  programEls.batchModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) {
      closeBatchModal();
    }
  });

  programEls.programSearchInput.addEventListener("input", (event) => {
    programUiState.searchTerm = event.target.value.trim().toLowerCase();
    renderProgramsTable();
  });

  programEls.batchSearchInput.addEventListener("input", (event) => {
    programUiState.batchSearchTerm = event.target.value.trim().toLowerCase();
    renderBatchesTable();
  });

  programEls.programStudentTypeFilter.addEventListener("change", (event) => {
    syncSelectedContactsFromVisibleInputs();
    programUiState.contactStudentTypeFilter = event.target.value;
    renderProgramContactsChecklist(programUiState.currentProgramBranchId, programUiState.selectedContactIds);
  });

  programEls.programStatusFilter.addEventListener("change", (event) => {
    syncSelectedContactsFromVisibleInputs();
    programUiState.contactStatusFilter = event.target.value;
    renderProgramContactsChecklist(programUiState.currentProgramBranchId, programUiState.selectedContactIds);
  });

  programEls.programContactsGrid.addEventListener("change", () => {
    syncSelectedContactsFromVisibleInputs();
  });

  programEls.batchStudentTypeFilter.addEventListener("change", (event) => {
    syncSelectedBatchContactsFromVisibleInputs();
    programUiState.batchStudentTypeFilter = event.target.value;
    renderBatchContactsChecklist(programUiState.currentBatchBranchId, programUiState.selectedBatchContactIds);
  });

  programEls.batchStatusFilter.addEventListener("change", (event) => {
    syncSelectedBatchContactsFromVisibleInputs();
    programUiState.batchStatusFilter = event.target.value;
    renderBatchContactsChecklist(programUiState.currentBatchBranchId, programUiState.selectedBatchContactIds);
  });

  programEls.batchContactsGrid.addEventListener("change", () => {
    syncSelectedBatchContactsFromVisibleInputs();
  });

  programEls.programsTableBody.addEventListener("click", handleProgramTableActions);
  programEls.batchesTableBody.addEventListener("click", handleBatchTableActions);

  window.addEventListener("crm:data-updated", () => {
    programUiState.activeBranchId = getCRMActiveBranchId();
    syncProgramsWithCRM();
    syncBatchesWithCRM();
    renderProgramBranchOptions();
    renderProgramsTable();
    renderBatchesTable();
  });

  window.addEventListener("crm:branch-changed", (event) => {
    programUiState.activeBranchId = event.detail?.branchId || "all";
    if (!programEls.programModal.classList.contains("hidden") && !programEls.programId.value) {
      programUiState.currentProgramBranchId = programUiState.activeBranchId === "all" ? "" : String(programUiState.activeBranchId);
      programUiState.selectedContactIds = [];
      renderProgramContactsChecklist(programUiState.currentProgramBranchId, programUiState.selectedContactIds);
    }
    if (!programEls.batchModal.classList.contains("hidden") && !programEls.batchId.value) {
      programUiState.currentBatchBranchId = programUiState.activeBranchId === "all" ? "" : String(programUiState.activeBranchId);
      programUiState.selectedBatchContactIds = [];
      renderBatchContactsChecklist(programUiState.currentBatchBranchId, programUiState.selectedBatchContactIds);
    }
    renderProgramsTable();
    renderBatchesTable();
  });

  window.addEventListener("crm:branch-deleted", (event) => {
    const branchId = event.detail?.branchId;
    if (!branchId) {
      return;
    }

    removeProgramsByBranch(branchId);
    removeBatchesByBranch(branchId);
  });
}

loadProgramsFromStorage();
loadBatchesFromStorage();
programUiState.activeBranchId = getInitialActiveBranchId();
syncProgramsWithCRM();
syncBatchesWithCRM();
bindProgramEvents();
setProgramTab("programs");
renderProgramBranchOptions();
renderProgramsTable();
renderBatchesTable();
fetchProgramsFromSupabase();
fetchBatchesFromSupabase();
