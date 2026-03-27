const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const CONTACTS_TABLE = "contacts";
const BRANCHES_TABLE = "branches";
const PROGRAMS_TABLE = "programs";

const STATUS_OPTIONS = ["lead", "trial", "joined", "completed", "dropped", "dried"];
const SOURCE_OPTIONS = ["call", "form", "referral"];
const STUDENT_TYPE_OPTIONS = ["regular_sessions", "hatha_yoga"];
const LOCAL_PROGRAMS_STORAGE_KEY = "yoga-crm-programs";
const ACTIVE_BRANCH_STORAGE_KEY = "yoga-crm-active-branch";
const ACTIVE_BRANCH_NAME_STORAGE_KEY = "yoga-crm-active-branch-name";
const SUPABASE_URL_STORAGE_KEY = "yoga-crm-supabase-url";
const SUPABASE_ANON_KEY_STORAGE_KEY = "yoga-crm-supabase-anon-key";

const state = {
  contacts: [],
  branches: [],
  branchesLoaded: false,
  activeBranchId: "all",
  activeFilter: "all",
  activeStudentType: "all",
  searchTerm: "",
  supabase: null,
  contactModalMode: "edit",
};

function publishCRMData() {
  window.crmData = {
    contacts: state.contacts,
    branches: state.branches,
    branchesLoaded: state.branchesLoaded,
  };
  window.dispatchEvent(new CustomEvent("crm:data-updated"));
}

function publishBranchSelection() {
  persistActiveBranch();
  window.dispatchEvent(new CustomEvent("crm:branch-changed", {
    detail: {
      branchId: state.activeBranchId,
      branchName: state.activeBranchId === "all" ? "All Branches" : getBranchName(state.activeBranchId),
    },
  }));
}

const elements = {
  addContactBtn: document.getElementById("addContactBtn"),
  manageBranchesBtn: document.getElementById("manageBranchesBtn"),
  manageBranchesLabel: document.getElementById("manageBranchesLabel"),
  branchDropdownMenu: document.getElementById("branchDropdownMenu"),
  addBranchQuickBtn: document.getElementById("addBranchQuickBtn"),
  branchDropdownList: document.getElementById("branchDropdownList"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  studentTypeFilter: document.getElementById("studentTypeFilter"),
  filterCount: document.getElementById("filterCount"),
  statusMessage: document.getElementById("statusMessage"),
  contactsTableBody: document.getElementById("contactsTableBody"),
  totalContacts: document.getElementById("totalContacts"),
  dueContacts: document.getElementById("dueContacts"),
  joinedContacts: document.getElementById("joinedContacts"),
  contactModal: document.getElementById("contactModal"),
  modalTitle: document.getElementById("modalTitle"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  deleteContactBtn: document.getElementById("deleteContactBtn"),
  editContactBtn: document.getElementById("editContactBtn"),
  saveBtn: document.getElementById("saveBtn"),
  contactForm: document.getElementById("contactForm"),
  contactId: document.getElementById("contactId"),
  name: document.getElementById("name"),
  phone: document.getElementById("phone"),
  location: document.getElementById("location"),
  status: document.getElementById("status"),
  studentType: document.getElementById("studentType"),
  source: document.getElementById("source"),
  lastContacted: document.getElementById("lastContacted"),
  nextFollowup: document.getElementById("nextFollowup"),
  notes: document.getElementById("notes"),
  branchModal: document.getElementById("branchModal"),
  closeBranchModalBtn: document.getElementById("closeBranchModalBtn"),
  branchForm: document.getElementById("branchForm"),
  branchName: document.getElementById("branchName"),
  branchesList: document.getElementById("branchesList"),
  branchHelperText: document.getElementById("branchHelperText"),
};

function hasSupabaseConfig(url, anonKey) {
  return Boolean(url && anonKey) && !url.includes("YOUR_") && !anonKey.includes("YOUR_");
}

function loadSupabaseConfig() {
  try {
    const url = window.localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || SUPABASE_URL;
    const anonKey = window.localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY) || SUPABASE_ANON_KEY;
    return {
      url: url.trim(),
      anonKey: anonKey.trim(),
    };
  } catch {
    return {
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
    };
  }
}

function persistSupabaseConfig(url, anonKey) {
  try {
    window.localStorage.setItem(SUPABASE_URL_STORAGE_KEY, url);
    window.localStorage.setItem(SUPABASE_ANON_KEY_STORAGE_KEY, anonKey);
  } catch {}
}

function promptForSupabaseConfig() {
  const existingConfig = loadSupabaseConfig();
  const url = window.prompt("Enter your Supabase Project URL", existingConfig.url.includes("YOUR_") ? "" : existingConfig.url);
  if (!url) {
    return false;
  }

  const anonKey = window.prompt("Enter your Supabase anon / publishable key", existingConfig.anonKey.includes("YOUR_") ? "" : existingConfig.anonKey);
  if (!anonKey) {
    return false;
  }

  const trimmedUrl = url.trim();
  const trimmedAnonKey = anonKey.trim();
  if (!hasSupabaseConfig(trimmedUrl, trimmedAnonKey)) {
    return false;
  }

  persistSupabaseConfig(trimmedUrl, trimmedAnonKey);
  return true;
}

function initializeSupabase() {
  if (!window.supabase) {
    setStatusMessage("Supabase library failed to load.", true);
    return;
  }

  let { url, anonKey } = loadSupabaseConfig();
  if (!hasSupabaseConfig(url, anonKey)) {
    const configured = promptForSupabaseConfig();
    ({ url, anonKey } = loadSupabaseConfig());
    if (!configured || !hasSupabaseConfig(url, anonKey)) {
      setStatusMessage("Supabase is not configured on this device yet. Refresh and enter the Project URL and anon key to continue.", true);
      return;
    }
  }

  state.supabase = window.supabase.createClient(url, anonKey);
}

function setStatusMessage(message, isWarning = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isWarning ? "var(--danger-text)" : "var(--text-soft)";
}

function setBranchHelper(message, isWarning = false) {
  elements.branchHelperText.textContent = message;
  elements.branchHelperText.style.color = isWarning ? "var(--danger-text)" : "var(--text-soft)";
}

function loadPersistedActiveBranch() {
  try {
    return window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY) || "all";
  } catch {
    return "all";
  }
}

function persistActiveBranch() {
  try {
    window.localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, String(state.activeBranchId || "all"));
    const branchName = state.activeBranchId === "all" ? "All Branches" : getBranchName(state.activeBranchId);
    window.localStorage.setItem(ACTIVE_BRANCH_NAME_STORAGE_KEY, branchName);
  } catch {}
}

function loadPersistedActiveBranchName() {
  try {
    return window.localStorage.getItem(ACTIVE_BRANCH_NAME_STORAGE_KEY) || "All Branches";
  } catch {
    return "All Branches";
  }
}

function formatDate(value) {
  if (!value) {
    return '<span class="muted-text">-</span>';
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function getFollowupState(dateValue) {
  if (!dateValue) {
    return "none";
  }

  const today = getTodayISO();
  if (dateValue < today) {
    return "overdue";
  }
  if (dateValue === today) {
    return "today";
  }
  return "upcoming";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parsePhoneNumbers(value = "") {
  return String(value)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getLocalPrograms() {
  try {
    const raw = window.localStorage.getItem(LOCAL_PROGRAMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalPrograms(programs) {
  try {
    window.localStorage.setItem(LOCAL_PROGRAMS_STORAGE_KEY, JSON.stringify(programs));
  } catch {}
}

function normalizeProgramRecord(program) {
  if (!program || typeof program !== "object") {
    return null;
  }

  const contactIds = Array.isArray(program.contact_ids)
    ? program.contact_ids
    : Array.isArray(program.contactIds)
      ? program.contactIds
      : [];

  return {
    id: String(program.id),
    branchId: String(program.branch_id ?? program.branchId ?? ""),
    name: String(program.name || "").trim(),
    scheduledFor: program.scheduled_for ?? program.scheduledFor ?? "",
    notes: program.notes ?? "",
    whatsappTemplate: program.whatsapp_template ?? program.whatsappTemplate ?? "",
    contactIds: contactIds
      .map((contactId) => Number(contactId))
      .filter((contactId) => Number.isFinite(contactId)),
    createdAt: program.created_at ?? program.createdAt ?? null,
  };
}

function getProgramPayload(program) {
  return {
    id: String(program.id),
    branch_id: Number(program.branchId),
    name: String(program.name || "").trim(),
    scheduled_for: program.scheduledFor || null,
    notes: program.notes || null,
    whatsapp_template: program.whatsappTemplate || null,
    contact_ids: Array.isArray(program.contactIds)
      ? program.contactIds
        .map((contactId) => Number(contactId))
        .filter((contactId) => Number.isFinite(contactId))
      : [],
  };
}

function formatPhoneStorage(value = "") {
  return parsePhoneNumbers(value).join("\n");
}

function getPrimaryPhoneNumber(value = "") {
  return parsePhoneNumbers(value)[0] || "";
}

function formatPhoneDisplay(value = "") {
  const phoneNumbers = parsePhoneNumbers(value);
  if (!phoneNumbers.length) {
    return '<span class="muted-text">-</span>';
  }

  return phoneNumbers.map((phoneNumber) => `<span class="phone-line">${escapeHtml(phoneNumber)}</span>`).join("");
}

function formatStudentType(value) {
  if (value === "regular_sessions") {
    return "Regular Sessions";
  }

  if (value === "hatha_yoga") {
    return "Hatha Yoga";
  }

  return "-";
}

function getBranchScopedContacts() {
  if (state.activeBranchId === "all") {
    return state.contacts;
  }

  return state.contacts.filter((contact) => String(contact.branch_id) === String(state.activeBranchId));
}

function getFilteredContacts() {
  return getBranchScopedContacts().filter((contact) => {
    const matchesStatus =
      state.activeFilter === "all" || contact.status === state.activeFilter;
    const matchesStudentType =
      state.activeStudentType === "all" || contact.student_type === state.activeStudentType;

    if (!matchesStatus || !matchesStudentType) {
      return false;
    }

    if (!state.searchTerm) {
      return true;
    }

    const haystack = [
      contact.name,
      contact.phone,
      contact.location,
      contact.source,
      contact.notes,
      contact.status,
      formatStudentType(contact.student_type),
      contact.branch?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(state.searchTerm);
  });
}

function getBranchName(branchId) {
  if (branchId && !state.branchesLoaded) {
    return "Loading branch...";
  }

  const branch = state.branches.find((item) => String(item.id) === String(branchId));
  return branch?.name || "Unassigned";
}

function updateSummary() {
  const scopedContacts = getBranchScopedContacts();
  const dueCount = scopedContacts.filter((contact) => {
    const followupState = getFollowupState(contact.next_followup);
    return followupState === "today" || followupState === "overdue";
  }).length;

  elements.totalContacts.textContent = String(scopedContacts.length);
  elements.dueContacts.textContent = String(dueCount);
  elements.joinedContacts.textContent = String(
    scopedContacts.filter((contact) => contact.status === "joined").length,
  );
}

function updateFilterCount(filteredCount) {
  const scopedCount = getBranchScopedContacts().length;
  elements.filterCount.textContent = `Showing ${filteredCount} of ${scopedCount} contact${scopedCount === 1 ? "" : "s"}`;
}

function renderBranchOptions() {
  if (
    state.branchesLoaded
    && state.activeBranchId !== "all"
    && !state.branches.some((branch) => String(branch.id) === String(state.activeBranchId))
  ) {
    state.activeBranchId = "all";
    persistActiveBranch();
  }
}

function renderBranchList() {
  if (!state.branches.length) {
    elements.branchesList.innerHTML = '<li class="branch-empty">No branches yet. Add your first studio branch below.</li>';
    return;
  }

  elements.branchesList.innerHTML = state.branches.map((branch) => {
    const contactCount = state.contacts.filter((contact) => String(contact.branch_id) === String(branch.id)).length;

    return `
      <li class="branch-item">
        <div>
          <strong>${escapeHtml(branch.name)}</strong>
          <span>${contactCount} contact${contactCount === 1 ? "" : "s"}</span>
        </div>
        <div class="actions-group">
          <button class="table-action" type="button" data-branch-edit="${branch.id}">Edit</button>
          <button class="table-action delete-action" type="button" data-branch-delete="${branch.id}">Delete</button>
        </div>
      </li>
    `;
  }).join("");
}

function renderBranchDropdown() {
  const allBranchesOption = `
    <div class="branch-dropdown-item">
      <button class="branch-dropdown-name" type="button" data-branch-select="all" role="menuitemradio" aria-checked="${state.activeBranchId === "all"}">All Branches</button>
    </div>
  `;

  if (!state.branches.length) {
    elements.branchDropdownList.innerHTML = `
      ${allBranchesOption}
      <p class="branch-dropdown-empty">No branches yet.</p>
    `;
    return;
  }

  const branchItems = state.branches.map((branch) => `
    <div class="branch-dropdown-item">
      <button class="branch-dropdown-name" type="button" data-branch-select="${branch.id}" role="menuitemradio" aria-checked="${String(branch.id) === String(state.activeBranchId)}">${escapeHtml(branch.name)}</button>
      <button class="branch-dropdown-edit" type="button" data-branch-edit="${branch.id}" role="menuitem">Edit</button>
    </div>
  `).join("");

  elements.branchDropdownList.innerHTML = `${allBranchesOption}${branchItems}`;
}

function updateBranchTriggerLabel() {
  if (state.activeBranchId === "all") {
    elements.manageBranchesLabel.textContent = "All Branches";
    return;
  }

  if (!state.branchesLoaded) {
    elements.manageBranchesLabel.textContent = loadPersistedActiveBranchName();
    return;
  }

  elements.manageBranchesLabel.textContent = getBranchName(state.activeBranchId);
}

function toggleBranchDropdown(forceOpen = null) {
  const shouldOpen = forceOpen ?? elements.branchDropdownMenu.classList.contains("hidden");
  elements.branchDropdownMenu.classList.toggle("hidden", !shouldOpen);
  elements.manageBranchesBtn.setAttribute("aria-expanded", String(shouldOpen));
}

function renderContacts() {
  const contacts = getFilteredContacts();
  updateFilterCount(contacts.length);

  if (!contacts.length) {
    elements.contactsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state-cell">No contacts found for the selected branch or active filters.</td>
      </tr>
    `;
    updateSummary();
    return;
  }

  elements.contactsTableBody.innerHTML = contacts.map((contact) => {
    const followupState = getFollowupState(contact.next_followup);
    const rowClass =
      followupState === "overdue" ? "row-overdue" : followupState === "today" ? "row-due" : "";

    const followupBadge =
      followupState === "overdue"
        ? '<span class="followup-pill followup-overdue">Overdue</span>'
        : followupState === "today"
          ? '<span class="followup-pill followup-today">Today</span>'
          : "";

    const branchMeta = state.activeBranchId === "all"
      ? `<span class="muted-text">${escapeHtml(contact.branch?.name || "Unassigned")} | ${escapeHtml(contact.source || "-")}</span>`
      : `<span class="muted-text">${escapeHtml(contact.source || "-")}</span>`;

    return `
      <tr class="${rowClass}">
        <td>
          <strong>${escapeHtml(contact.name)}</strong><br>
          ${branchMeta}
        </td>
        <td>${formatPhoneDisplay(contact.phone)}</td>
        <td>${escapeHtml(contact.location || "-")}</td>
        <td><span class="student-type-pill student-type-${escapeHtml(contact.student_type || "regular_sessions")}">${escapeHtml(formatStudentType(contact.student_type))}</span></td>
        <td><span class="status-pill status-${escapeHtml(contact.status)}">${escapeHtml(contact.status)}</span></td>
        <td>${formatDate(contact.last_contacted)}</td>
        <td>
          ${formatDate(contact.next_followup)}
          ${followupBadge}
        </td>
        <td class="note-cell">${escapeHtml(contact.notes || "-")}</td>
        <td class="actions-cell">
          <div class="actions-group">
            <button class="table-action" type="button" data-action="edit" data-id="${contact.id}">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  updateSummary();
}

function refreshBranchUI() {
  renderBranchOptions();
  renderBranchList();
  renderBranchDropdown();
  updateBranchTriggerLabel();
}

function refreshContactUI() {
  renderContacts();
  publishCRMData();
}

function syncBranchNameIntoContacts(branchId, branchName) {
  state.contacts = state.contacts.map((contact) => {
    if (String(contact.branch_id) !== String(branchId)) {
      return contact;
    }

    return {
      ...contact,
      branch: {
        ...(contact.branch || {}),
        id: Number(branchId),
        name: branchName,
      },
    };
  });
}

function upsertBranchInState(branch) {
  const nextBranch = { ...branch };
  const existingIndex = state.branches.findIndex((item) => String(item.id) === String(branch.id));

  if (existingIndex >= 0) {
    state.branches[existingIndex] = nextBranch;
  } else {
    state.branches.push(nextBranch);
  }

  state.branches.sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  syncBranchNameIntoContacts(branch.id, branch.name);
}

function removeBranchFromState(branchId) {
  state.branches = state.branches.filter((branch) => String(branch.id) !== String(branchId));
}

function upsertContactInState(contact) {
  const nextContact = { ...contact };
  const existingIndex = state.contacts.findIndex((item) => String(item.id) === String(contact.id));

  if (existingIndex >= 0) {
    state.contacts[existingIndex] = nextContact;
  } else {
    state.contacts.unshift(nextContact);
  }
}

function removeContactFromState(contactId) {
  state.contacts = state.contacts.filter((contact) => String(contact.id) !== String(contactId));
}

function removeContactsByBranchFromState(branchId) {
  state.contacts = state.contacts.filter((contact) => String(contact.branch_id) !== String(branchId));
}

function resetForm() {
  elements.contactForm.reset();
  elements.contactId.value = "";
  elements.deleteContactBtn.classList.add("hidden");
  elements.editContactBtn.classList.add("hidden");
  elements.saveBtn.classList.remove("hidden");
  elements.status.value = STATUS_OPTIONS[0];
  elements.studentType.value = STUDENT_TYPE_OPTIONS[0];
  elements.source.value = SOURCE_OPTIONS[0];
  elements.modalTitle.textContent = "Add Contact";
  setContactFormReadOnly(false);
  state.contactModalMode = "edit";
}

function setContactFormReadOnly(isReadOnly) {
  const fields = [
    elements.name,
    elements.phone,
    elements.location,
    elements.status,
    elements.studentType,
    elements.source,
    elements.lastContacted,
    elements.nextFollowup,
    elements.notes,
  ];

  fields.forEach((field) => {
    if (!field) {
      return;
    }

    field.disabled = isReadOnly;
    field.readOnly = isReadOnly;
  });
}

function applyContactModalMode(contact = null, mode = "edit") {
  const isReadOnly = mode === "view";
  state.contactModalMode = mode;
  setContactFormReadOnly(isReadOnly);

  if (!contact) {
    elements.modalTitle.textContent = "Add Contact";
    elements.deleteContactBtn.classList.add("hidden");
    elements.editContactBtn.classList.add("hidden");
    elements.saveBtn.classList.remove("hidden");
    return;
  }

  elements.modalTitle.textContent = isReadOnly ? "Contact Details" : "Edit Contact";
  elements.deleteContactBtn.classList.toggle("hidden", isReadOnly);
  elements.editContactBtn.classList.toggle("hidden", !isReadOnly);
  elements.saveBtn.classList.toggle("hidden", isReadOnly);
}

function openModal(contact = null, { mode = "edit" } = {}) {
  if (!state.branches.length) {
    setStatusMessage("Create at least one branch before adding contacts.", true);
    openBranchModal();
    return;
  }

  resetForm();

  if (contact) {
    elements.contactId.value = contact.id;
    elements.name.value = contact.name || "";
    elements.phone.value = formatPhoneStorage(contact.phone || "");
    elements.location.value = contact.location || "";
    elements.status.value = contact.status || STATUS_OPTIONS[0];
    elements.studentType.value = contact.student_type || STUDENT_TYPE_OPTIONS[0];
    elements.source.value = contact.source || SOURCE_OPTIONS[0];
    elements.lastContacted.value = contact.last_contacted || "";
    elements.nextFollowup.value = contact.next_followup || "";
    elements.notes.value = contact.notes || "";
  }

  applyContactModalMode(contact, mode);

  elements.contactModal.classList.remove("hidden");
  elements.contactModal.setAttribute("aria-hidden", "false");
}

function openContactFromExternal(contactId) {
  const contact = getContactById(contactId);
  if (!contact) {
    setStatusMessage("That contact could not be found.", true);
    return false;
  }

  openModal(contact, { mode: "view" });
  return true;
}

function closeModal() {
  elements.contactModal.classList.add("hidden");
  elements.contactModal.setAttribute("aria-hidden", "true");
}

function openBranchModal() {
  toggleBranchDropdown(false);
  elements.branchModal.classList.remove("hidden");
  elements.branchModal.setAttribute("aria-hidden", "false");
  elements.branchName.focus();
}

function closeBranchModal() {
  elements.branchModal.classList.add("hidden");
  elements.branchModal.setAttribute("aria-hidden", "true");
}

function getContactById(contactId) {
  return state.contacts.find((contact) => String(contact.id) === String(contactId));
}

function getFormPayload() {
  const existingContact = elements.contactId.value ? getContactById(elements.contactId.value) : null;
  const selectedBranchId =
    state.activeBranchId !== "all"
      ? Number(state.activeBranchId)
      : existingContact?.branch_id ?? null;

  return {
    branch_id: selectedBranchId,
    name: elements.name.value.trim(),
    phone: formatPhoneStorage(elements.phone.value),
    location: elements.location.value.trim() || null,
    status: elements.status.value,
    student_type: elements.studentType.value,
    source: elements.source.value,
    last_contacted: elements.lastContacted.value || null,
    next_followup: elements.nextFollowup.value || null,
    notes: elements.notes.value.trim() || null,
  };
}

async function loadBranches() {
  if (!state.supabase) {
    state.branchesLoaded = true;
    renderBranchOptions();
    renderBranchList();
    return;
  }

  const { data, error } = await state.supabase
    .from(BRANCHES_TABLE)
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    setStatusMessage(`Could not load branches: ${error.message}`, true);
    return;
  }

  state.branches = data || [];
  state.branchesLoaded = true;
  renderBranchOptions();
  renderBranchList();
  renderBranchDropdown();
  updateBranchTriggerLabel();
  publishCRMData();
}

async function loadContacts() {
  if (!state.supabase) {
    renderContacts();
    return;
  }

  const { data, error } = await state.supabase
    .from(CONTACTS_TABLE)
    .select("*, branch:branches(id, name)")
    .order("next_followup", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    setStatusMessage(`Could not load contacts: ${error.message}`, true);
    return;
  }

  state.contacts = data || [];
  setStatusMessage("");
  renderBranchList();
  renderContacts();
  publishCRMData();
}

async function refreshAll() {
  if (!state.supabase) {
    renderBranchOptions();
    renderBranchList();
    renderContacts();
    return;
  }

  setStatusMessage("Refreshing CRM...");
  await loadBranches();
  await loadContacts();
  setStatusMessage("");
}

function clearFilters() {
  state.activeBranchId = "all";
  state.activeFilter = "all";
  state.activeStudentType = "all";
  state.searchTerm = "";

  elements.statusFilter.value = "all";
  elements.studentTypeFilter.value = "all";
  elements.searchInput.value = "";

  renderBranchDropdown();
  updateBranchTriggerLabel();
  publishBranchSelection();
  renderContacts();
}

async function createBranch(name) {
  const { data, error } = await state.supabase
    .from(BRANCHES_TABLE)
    .insert({ name })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateBranch(branchId, name) {
  const { data, error } = await state.supabase
    .from(BRANCHES_TABLE)
    .update({ name })
    .eq("id", branchId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deleteBranch(branchId) {
  const { error } = await state.supabase.from(BRANCHES_TABLE).delete().eq("id", branchId);

  if (error) {
    throw error;
  }
}

async function deleteContactsByBranch(branchId) {
  const { error } = await state.supabase
    .from(CONTACTS_TABLE)
    .delete()
    .eq("branch_id", branchId);

  if (error) {
    throw error;
  }
}

async function loadPrograms() {
  if (!state.supabase) {
    return getLocalPrograms()
      .map(normalizeProgramRecord)
      .filter(Boolean);
  }

  const { data, error } = await state.supabase
    .from(PROGRAMS_TABLE)
    .select("*")
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const programs = (data || []).map(normalizeProgramRecord).filter(Boolean);
  setLocalPrograms(programs);
  return programs;
}

async function upsertProgram(program) {
  if (!state.supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const { data, error } = await state.supabase
    .from(PROGRAMS_TABLE)
    .upsert(getProgramPayload(program), { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeProgramRecord(data);
}

async function deleteProgram(programId) {
  if (!state.supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const { error } = await state.supabase
    .from(PROGRAMS_TABLE)
    .delete()
    .eq("id", String(programId));

  if (error) {
    throw error;
  }
}

async function deleteProgramsByBranch(branchId) {
  if (!state.supabase) {
    return;
  }

  const { error } = await state.supabase
    .from(PROGRAMS_TABLE)
    .delete()
    .eq("branch_id", Number(branchId));

  if (error) {
    throw error;
  }
}

async function countProgramsByBranch(branchId) {
  if (!state.supabase) {
    return getLocalPrograms().filter((program) => String(program.branchId) === String(branchId)).length;
  }

  const { count, error } = await state.supabase
    .from(PROGRAMS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("branch_id", Number(branchId));

  if (error) {
    throw error;
  }

  return count || 0;
}

async function createContact(payload) {
  const { data, error } = await state.supabase
    .from(CONTACTS_TABLE)
    .insert(payload)
    .select("*, branch:branches(id, name)")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateContact(contactId, payload) {
  const { data, error } = await state.supabase
    .from(CONTACTS_TABLE)
    .update(payload)
    .eq("id", contactId)
    .select("*, branch:branches(id, name)")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deleteContact(contactId) {
  const { error } = await state.supabase.from(CONTACTS_TABLE).delete().eq("id", contactId);

  if (error) {
    throw error;
  }
}

async function markFollowupDone(contactId) {
  const { error } = await state.supabase
    .from(CONTACTS_TABLE)
    .update({ last_contacted: getTodayISO() })
    .eq("id", contactId);

  if (error) {
    throw error;
  }
}

async function saveContact(event) {
  event.preventDefault();

  if (!state.supabase) {
    setStatusMessage("Supabase is not configured yet.", true);
    return;
  }

  const payload = getFormPayload();
  if (!payload.branch_id) {
    setStatusMessage("Choose a branch from the top dropdown before saving this contact.", true);
    return;
  }
  if (!parsePhoneNumbers(payload.phone).length) {
    setStatusMessage("Please enter at least one phone number.", true);
    return;
  }

  const contactId = elements.contactId.value;

  try {
    setStatusMessage(contactId ? "Updating contact..." : "Saving contact...");
    if (contactId) {
      const updatedContact = await updateContact(contactId, payload);
      upsertContactInState(updatedContact);
      setStatusMessage("Contact updated.");
    } else {
      const createdContact = await createContact(payload);
      upsertContactInState(createdContact);
      setStatusMessage("Contact added.");
    }

    closeModal();
    refreshBranchUI();
    refreshContactUI();
  } catch (error) {
    setStatusMessage(`Save failed: ${error.message}`, true);
  }
}

async function deleteCurrentContact() {
  const contactId = elements.contactId.value;
  if (!contactId) {
    return;
  }

  const contact = getContactById(contactId);
  if (!contact) {
    setStatusMessage("That contact could not be found.", true);
    return;
  }

  if (!state.supabase) {
    setStatusMessage("Supabase is not configured yet.", true);
    return;
  }

  const confirmed = window.confirm(`Delete ${contact.name}?`);
  if (!confirmed) {
    return;
  }

  try {
    setStatusMessage("Deleting contact...");
    await deleteContact(contactId);
    removeContactFromState(contactId);
    closeModal();
    refreshBranchUI();
    refreshContactUI();
    setStatusMessage("Contact deleted.");
  } catch (error) {
    setStatusMessage(`Delete failed: ${error.message}`, true);
  }
}

async function saveBranch(event) {
  event.preventDefault();

  if (!state.supabase) {
    setBranchHelper("Supabase is not configured yet.", true);
    return;
  }

  const name = elements.branchName.value.trim();
  if (!name) {
    setBranchHelper("Please enter a branch name.", true);
    return;
  }

  try {
    setBranchHelper("Adding branch...");
    const createdBranch = await createBranch(name);
    upsertBranchInState(createdBranch);
    elements.branchForm.reset();
    refreshBranchUI();
    refreshContactUI();
    setBranchHelper("Branch added.");
  } catch (error) {
    setBranchHelper(`Could not add branch: ${error.message}`, true);
  }
}

function buildFollowupMessage(contact) {
  return `Hi ${contact.name}, just checking in from YogaUnnati about your yoga journey. Let us know if you'd like to book your next class or have any questions.`;
}

function fallbackCopyText(text) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
}

async function copyMessage(contactId) {
  const contact = getContactById(contactId);
  if (!contact) {
    return;
  }

  try {
    const message = buildFollowupMessage(contact);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
    } else {
      fallbackCopyText(message);
    }
    setStatusMessage(`Follow-up message copied for ${contact.name}.`);
  } catch (error) {
    setStatusMessage(`Clipboard copy failed: ${error.message}`, true);
  }
}

async function handleBranchDelete(event) {
  const editButton = event.target.closest("[data-branch-edit]");
  if (editButton) {
    const branchId = editButton.dataset.branchEdit;
    const branch = state.branches.find((item) => String(item.id) === String(branchId));
    if (!branch) {
      return;
    }

    const nextName = window.prompt("Rename branch", branch.name);
    if (nextName === null) {
      return;
    }

    const trimmedName = nextName.trim();
    if (!trimmedName) {
      setBranchHelper("Branch name cannot be empty.", true);
      return;
    }

    if (trimmedName === branch.name) {
      return;
    }

    try {
      setBranchHelper("Updating branch...");
      await updateBranch(branchId, trimmedName);
      await loadBranches();
      await loadContacts();
      setBranchHelper("Branch updated.");
    } catch (error) {
      setBranchHelper(`Could not update branch: ${error.message}`, true);
    }
    return;
  }

  const deleteButton = event.target.closest("[data-branch-delete]");
  if (!deleteButton) {
    return;
  }

  const branchId = deleteButton.dataset.branchDelete;
  const branchName = getBranchName(branchId);
  const contactCount = state.contacts.filter((contact) => String(contact.branch_id) === String(branchId)).length;
  let programCount = 0;

  try {
    programCount = await countProgramsByBranch(branchId);
  } catch (error) {
    setBranchHelper(`Could not check linked programs: ${error.message}`, true);
    return;
  }

  const hasLinkedData = Boolean(contactCount || programCount);

  const confirmed = window.confirm(
    hasLinkedData
      ? `Delete branch "${branchName}" and its ${contactCount} contact${contactCount === 1 ? "" : "s"} and ${programCount} program${programCount === 1 ? "" : "s"}?`
      : `Delete branch "${branchName}"?`,
  );
  if (!confirmed) {
    return;
  }

  const reconfirmed = window.confirm(
    hasLinkedData
      ? `This will permanently remove "${branchName}", ${contactCount} linked contact${contactCount === 1 ? "" : "s"}, and ${programCount} linked program${programCount === 1 ? "" : "s"}. Continue?`
      : `This will permanently remove "${branchName}". Continue?`,
  );
  if (!reconfirmed) {
    return;
  }

  try {
    setBranchHelper(hasLinkedData ? "Deleting branch, contacts, and programs..." : "Deleting branch...");
    if (contactCount) {
      await deleteContactsByBranch(branchId);
      removeContactsByBranchFromState(branchId);
    }
    if (programCount) {
      await deleteProgramsByBranch(branchId);
    }
    await deleteBranch(branchId);
    removeBranchFromState(branchId);
    window.dispatchEvent(new CustomEvent("crm:branch-deleted", {
      detail: { branchId },
    }));
    if (String(state.activeBranchId) === String(branchId)) {
      state.activeBranchId = "all";
    }
    refreshBranchUI();
    publishBranchSelection();
    refreshContactUI();
    setBranchHelper(hasLinkedData ? "Branch, contacts, and programs deleted." : "Branch deleted.");
  } catch (error) {
    setBranchHelper(`Could not delete branch: ${error.message}`, true);
  }
}

async function handleBranchDropdown(event) {
  const selectButton = event.target.closest("[data-branch-select]");
  if (selectButton) {
    state.activeBranchId = selectButton.dataset.branchSelect;
    renderBranchDropdown();
    updateBranchTriggerLabel();
    publishBranchSelection();
    renderContacts();
    toggleBranchDropdown(false);
    return;
  }

  const editButton = event.target.closest("[data-branch-edit]");
  if (!editButton) {
    return;
  }

  toggleBranchDropdown(false);
  const branchId = editButton.dataset.branchEdit;
  const branch = state.branches.find((item) => String(item.id) === String(branchId));
  if (!branch) {
    return;
  }

  const nextName = window.prompt("Rename branch", branch.name);
  if (nextName === null) {
    return;
  }

  const trimmedName = nextName.trim();
  if (!trimmedName) {
    setBranchHelper("Branch name cannot be empty.", true);
    return;
  }

  if (trimmedName === branch.name) {
    return;
  }

  try {
    setBranchHelper("Updating branch...");
    const updatedBranch = await updateBranch(branchId, trimmedName);
    upsertBranchInState(updatedBranch);
    refreshBranchUI();
    refreshContactUI();
    setBranchHelper("Branch updated.");
  } catch (error) {
    setBranchHelper(`Could not update branch: ${error.message}`, true);
  }
}

async function handleTableAction(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const { action, id } = actionButton.dataset;
  const contact = getContactById(id);

  if (!contact) {
    return;
  }

  if (action === "edit") {
    openModal(contact);
    return;
  }
}

function bindEvents() {
  elements.addContactBtn.addEventListener("click", () => openModal());
  elements.manageBranchesBtn.addEventListener("click", () => toggleBranchDropdown());
  elements.addBranchQuickBtn.addEventListener("click", openBranchModal);
  elements.branchDropdownList.addEventListener("click", handleBranchDropdown);
  elements.clearFiltersBtn.addEventListener("click", clearFilters);
  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.cancelBtn.addEventListener("click", closeModal);
  elements.deleteContactBtn.addEventListener("click", deleteCurrentContact);
  elements.editContactBtn.addEventListener("click", () => {
    const contact = getContactById(elements.contactId.value);
    if (!contact) {
      return;
    }

    openModal(contact, { mode: "edit" });
  });
  elements.closeBranchModalBtn.addEventListener("click", closeBranchModal);
  elements.contactForm.addEventListener("submit", saveContact);
  elements.branchForm.addEventListener("submit", saveBranch);

  elements.contactModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) {
      closeModal();
    }
  });

  elements.branchModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) {
      closeBranchModal();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".branch-dropdown")) {
      toggleBranchDropdown(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeBranchModal();
      toggleBranchDropdown(false);
    }
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.activeFilter = event.target.value;
    renderContacts();
  });

  elements.studentTypeFilter.addEventListener("change", (event) => {
    state.activeStudentType = event.target.value;
    renderContacts();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderContacts();
  });

  elements.contactsTableBody.addEventListener("click", handleTableAction);
  elements.branchesList.addEventListener("click", handleBranchDelete);
}

async function init() {
  initializeSupabase();
  state.activeBranchId = loadPersistedActiveBranch();
  window.crmApi = {
    isSupabaseReady: () => Boolean(state.supabase),
    loadPrograms,
    upsertProgram,
    deleteProgram,
    deleteProgramsByBranch,
    countProgramsByBranch,
    getCachedPrograms: getLocalPrograms,
    setCachedPrograms: setLocalPrograms,
    setStatusMessage,
  };
  bindEvents();
  window.crmActions = {
    openContact: openContactFromExternal,
  };
  renderBranchOptions();
  renderBranchList();
  renderBranchDropdown();
  updateBranchTriggerLabel();
  publishBranchSelection();
  renderContacts();
  await refreshAll();
}

init();
