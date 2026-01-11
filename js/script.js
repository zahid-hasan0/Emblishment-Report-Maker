// ========================================== 
// GLOBAL STATE & CONFIG
// ========================================== 
let drafts = [];
// db and REPORTS_COLLECTION are defined in firebase-config.js
let jobInput, addBtn, draftTable, draftCount, submitSelectedBtn, globalSelectAll, deleteAllDraftsBtn;
let dbReportTable, dbTotalCount, submissionStatus;
let fetchedReports = [];

// Pagination State
let currentPage = 1;
const itemsPerPage = 25;

// ========================================== 
// INITIALIZATION
// ========================================== 
document.addEventListener("DOMContentLoaded", () => {
    // Check Config
    if (typeof db === 'undefined') {
        console.error("Firebase globals not found!");
    }

    // Load drafts
    loadDraftsFromStorage();

    // Assign DOM elements - Entry Page
    jobInput = document.getElementById("jobNumbers");
    addBtn = document.getElementById("addBtn");
    draftTable = document.getElementById("draftTable");
    draftCount = document.getElementById("draftCountBadge");
    submitSelectedBtn = document.getElementById("submitSelected");
    globalSelectAll = document.getElementById("checkAll");
    deleteAllDraftsBtn = document.getElementById("deleteAllBtn");
    submissionStatus = document.getElementById("submissionStatus");

    // Assign DOM elements - Report Page
    dbReportTable = document.getElementById("dbReportTable");
    dbTotalCount = document.getElementById("dbTotalCount");

    // Listeners - Index Page
    const copyDraftsBtn = document.getElementById("copyDraftsBtn");
    const whatsappSelectedBtn = document.getElementById("whatsappSelectedBtn");

    if (addBtn) addBtn.addEventListener("click", addDrafts);
    if (submitSelectedBtn) submitSelectedBtn.addEventListener("click", submitSelectedToFirestore);
    if (globalSelectAll) globalSelectAll.addEventListener("change", toggleSelectAll);
    if (deleteAllDraftsBtn) deleteAllDraftsBtn.addEventListener("click", deleteAllDrafts);
    if (copyDraftsBtn) copyDraftsBtn.addEventListener("click", copySelectedDrafts);
    if (whatsappSelectedBtn) whatsappSelectedBtn.addEventListener("click", openWhatsappModal);

    // Final WhatsApp Send
    const waFinalSendBtn = document.getElementById("waFinalSendBtn");
    if (waFinalSendBtn) waFinalSendBtn.addEventListener("click", sendWhatsAppMessage);

    // Listeners - Report Page
    const printBtn = document.getElementById("printBtn");
    const excelBtn = document.getElementById("excelBtn");
    const copyBtn = document.getElementById("copyBtn");
    if (printBtn) printBtn.addEventListener("click", printDbReport);
    if (excelBtn) excelBtn.addEventListener("click", exportDbExcel);
    if (copyBtn) copyBtn.addEventListener("click", copyDbToClipboard);

    // Render initial UI
    if (draftTable) renderDrafts();
    if (dbReportTable) loadReportsFromFirestore();
});

// ========================================== 
// STORAGE FUNCTIONS
// ========================================== 
function loadDraftsFromStorage() {
    try {
        let rawDrafts = JSON.parse(localStorage.getItem('jobReports') || '[]');
        // Validate and clean
        drafts = rawDrafts.filter(d => d && typeof d === 'object' && d.jobNo && d.jobNo.trim() !== '' && d.id);

        if (drafts.length !== rawDrafts.length) saveDraftsToStorage();
    } catch (e) {
        console.error("Error loading drafts:", e);
        drafts = [];
    }
}

function saveDraftsToStorage() {
    try {
        localStorage.setItem('jobReports', JSON.stringify(drafts));
    } catch (e) {
        console.error("Error saving drafts:", e);
        showToast("Error saving data to local storage", "danger");
    }
}

// ========================================== 
// LOGIC: DRAFTS (INDEX PAGE)
// ========================================== 
function addDrafts() {
    if (!jobInput) return;

    const rawInput = jobInput.value.trim();
    if (!rawInput) {
        showToast("Please enter a job number first.", "warning");
        return;
    }

    const inputJobs = rawInput.split(/,|\n/).map(j => j.trim()).filter(j => j !== "");
    const uniqueInputs = [...new Set(inputJobs)];
    const newJobs = [];
    const duplicates = [];

    uniqueInputs.forEach(jobNo => {
        if (drafts.some(d => d.jobNo === jobNo)) {
            duplicates.push(jobNo);
        } else {
            newJobs.push(jobNo);
        }
    });

    if (newJobs.length === 0) {
        showToast(duplicates.length > 0 ? "Skipped duplicate jobs." : "No valid jobs to add.", "warning");
        return;
    }

    newJobs.forEach(jobNo => {
        drafts.push({
            id: crypto.randomUUID(),
            jobNo,
            buyer: "",
            wo: "",
            status: "Pending",
            comments: "",
            editable: true,
            selected: false
        });
    });

    jobInput.value = "";
    saveDraftsToStorage();
    renderDrafts();
    showToast(`Added ${newJobs.length} new jobs.`, "success");
}

function renderDrafts() {
    if (!draftTable) return;

    draftTable.innerHTML = "";
    if (draftCount) draftCount.textContent = drafts.length;

    drafts.forEach((d, index) => {
        draftTable.appendChild(createRow(d, index + 1));
    });

    updateSubmitButton();
    updateSelectAllCheckbox();
}

function createRow(d, sl) {
    const tr = document.createElement("tr");
    const isChecked = d.selected ? "checked" : "";

    if (d.selected) tr.classList.add("table-active");

    const isEditable = d.editable !== false; // Default to true if undefined

    tr.innerHTML = `
        <td class="text-center"><input type="checkbox" class="form-check-input" ${isChecked} onchange="toggleRowSelection('${d.id}')"></td>
        <td class="fw-bold text-muted">${sl}</td>
        <td class="fw-bold text-primary text-nowrap">${d.jobNo}</td>
        <td>
            ${isEditable
            ? `<input type="text" class="form-control" value="${d.buyer || ''}" onchange="updateDraftField('${d.id}', 'buyer', this.value)" placeholder="Buyer">`
            : `<span class="fw-semibold">${d.buyer || '-'}</span>`}
        </td>
        <td>
            ${isEditable
            ? `<input type="text" class="form-control" value="${d.wo || ''}" onchange="updateDraftField('${d.id}', 'wo', this.value)" placeholder="WO #">`
            : `<span>${d.wo || '-'}</span>`}
        </td>
        <td>
            ${isEditable
            ? `<select class="form-select" onchange="updateDraftField('${d.id}', 'status', this.value)">
                    <option value="Pending" ${d.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Approved" ${d.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="Rejected" ${d.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                   </select>`
            : `<span class="badge ${getStatusBadge(d.status)}">${d.status}</span>`}
        </td>
        <td>
            ${isEditable
            ? `<input type="text" class="form-control" value="${d.comments || ''}" onchange="updateDraftField('${d.id}', 'comments', this.value)" placeholder="Comments">`
            : `<small class="text-muted">${d.comments || '-'}</small>`}
        </td>
        <td class="text-end">
            <div class="row-actions">
                ${isEditable
            ? `<button class="btn-gms-row btn-gms-row-save" onclick="saveDraftRow('${d.id}')">Save</button>`
            : `<button class="btn-gms-row btn-gms-row-edit" onclick="editDraftRow('${d.id}')">Edit</button>`
        }
                <button class="btn-gms-row btn-gms-row-delete" onclick="deleteDraftRow('${d.id}')">Delete</button>
            </div>
        </td>
    `;
    return tr;
}

window.updateDraftField = function (id, field, value) {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        draft[field] = value.trim();
        saveDraftsToStorage();
    }
};

window.saveDraftRow = function (id) {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        draft.editable = false;
        saveDraftsToStorage();
        renderDrafts();
        showToast("Row saved locally!", "success");
    }
};

window.editDraftRow = function (id) {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        draft.editable = true;
        renderDrafts();
    }
};

// --- Shared Feature Logic ---
function getSmartDraftText(selected, includeStatus = true) {
    let text = "";
    selected.forEach(d => {
        let row = `${d.jobNo}`;
        if (d.buyer) row += `   ${d.buyer}`;
        if (d.wo) row += `   ${d.wo}`;
        if (includeStatus && d.status && d.status !== 'Pending') row += `   ${d.status}`;
        if (d.comments) row += `   ${d.comments}`;
        text += row + "\n";
    });

    // Global Suffix
    text += "\nNeed Emblishment Wo";
    return text.trim();
}

// --- Copy Selected Feature ---
function copySelectedDrafts() {
    const selected = drafts.filter(d => d.selected);

    if (selected.length === 0) {
        showToast("Please select rows to copy first!", "warning");
        return;
    }

    const textToCopy = getSmartDraftText(selected);

    navigator.clipboard.writeText(textToCopy)
        .then(() => showToast(`Smart Copied ${selected.length} jobs!`, "success"))
        .catch(err => showToast("Failed to copy: " + err, "danger"));
}

// --- Row Actions ---
// Row level save is handled by global Save Button and auto-save on change

// Basic actions

window.deleteDraftRow = function (id) {
    showConfirm("Delete this draft?", () => {
        drafts = drafts.filter(d => d.id !== id);
        saveDraftsToStorage();
        renderDrafts();
        showToast("Draft deleted", "danger");
    });
};

window.deleteAllDrafts = function () {
    if (drafts.length === 0) return;
    showConfirm("Delete ALL drafts? This cannot be undone.", () => {
        drafts = [];
        saveDraftsToStorage();
        renderDrafts();
        showToast("All drafts deleted", "danger");
    });
};

window.toggleRowSelection = function (id) {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
        draft.selected = !draft.selected;
        saveDraftsToStorage();
        updateSubmitButton();
        updateSelectAllCheckbox();
        renderDrafts(); // Re-render to show highlight
    }
};

// --- Selection Logic ---
function toggleSelectAll() {
    const isChecked = globalSelectAll.checked;
    drafts.forEach(d => d.selected = isChecked);
    saveDraftsToStorage();
    renderDrafts();
}

function updateSubmitButton() {
    if (!submitSelectedBtn) return;
    const selectedCount = drafts.filter(d => d.selected).length;
    submitSelectedBtn.disabled = selectedCount === 0;
    submitSelectedBtn.innerHTML = selectedCount > 0
        ? `<i class="fas fa-cloud-upload-alt me-2"></i>Submit Selected (${selectedCount})`
        : `<i class="fas fa-cloud-upload-alt me-2"></i>Submit Selected`;
}

function updateSelectAllCheckbox() {
    if (!globalSelectAll || drafts.length === 0) return;
    const allSelected = drafts.every(d => d.selected);
    const someSelected = drafts.some(d => d.selected);
    globalSelectAll.checked = allSelected;
    globalSelectAll.indeterminate = someSelected && !allSelected;
}

// ==========================================
// FIRESTORE SUBMISSION
// ==========================================
function submitSelectedToFirestore() {
    const selectedDrafts = drafts.filter(d => d.selected);
    if (selectedDrafts.length === 0) return;

    if (selectedDrafts.some(d => !d.buyer || !d.wo)) {
        showToast("Buyer and WO are required for all selected jobs.", "warning");
        return;
    }

    showConfirm(`Submit ${selectedDrafts.length} jobs to database?`, () => {
        submitSelectedBtn.disabled = true;
        if (submissionStatus) submissionStatus.textContent = "Sending...";

        const batch = db.batch();
        selectedDrafts.forEach(draft => {
            const { id, editable, selected, ...data } = draft;
            data.submittedAt = new Date().toISOString();
            const docRef = db.collection(REPORTS_COLLECTION).doc();
            batch.set(docRef, data);
        });

        batch.commit()
            .then(() => {
                drafts = drafts.filter(d => !d.selected);
                if (globalSelectAll) globalSelectAll.checked = false;
                saveDraftsToStorage();
                renderDrafts();
                if (submissionStatus) submissionStatus.textContent = "";
                showToast("Successfully submitted!", "success");
            })
            .catch((error) => {
                console.error("Submission error", error);
                if (submissionStatus) submissionStatus.textContent = "";
                showToast("Error: " + error.message, "danger");
            })
            .finally(() => {
                submitSelectedBtn.disabled = false;
                updateSubmitButton();
            });
    });
}

// ==========================================
// LOGIC: REPORT PAGE (DATABASE VIEW)
// ==========================================
function loadReportsFromFirestore() {
    if (!dbReportTable) return;
    dbReportTable.innerHTML = '<tr><td colspan="8" class="text-center py-5">Loading...</td></tr>';

    db.collection(REPORTS_COLLECTION)
        .orderBy("submittedAt", "desc")
        .get()
        .then((querySnapshot) => {
            fetchedReports = [];
            querySnapshot.forEach((doc) => {
                fetchedReports.push({ id: doc.id, ...doc.data() });
            });
            currentPage = 1; // Reset to page 1 on load
            renderDbReportsWithFilter(); // Initial Render
            updateStats();
        })
        .catch((error) => {
            console.error("Error loading reports:", error);
            dbReportTable.innerHTML = `<tr class="text-danger"><td colspan="8" class="text-center">Error: ${error.message}</td></tr>`;
        });
}

function updateStats() {
    const totalInfo = document.getElementById("totalJobs");
    const pendingInfo = document.getElementById("pendingJobs");
    const approvedInfo = document.getElementById("approvedJobs");
    const rejectedInfo = document.getElementById("rejectedJobs");

    if (totalInfo) totalInfo.innerText = fetchedReports.length;
    if (pendingInfo) pendingInfo.innerText = fetchedReports.filter(r => r.status === "Pending").length;
    if (approvedInfo) approvedInfo.innerText = fetchedReports.filter(r => r.status === "Approved").length;
    if (rejectedInfo) rejectedInfo.innerText = fetchedReports.filter(r => r.status === "Rejected").length;
}

// --- Pagination & Filtering ---
window.changePage = function (newPage) {
    currentPage = newPage;
    renderDbReportsWithFilter();
}

// Global Wrappers
window.filterTable = () => {
    currentPage = 1;
    renderDbReportsWithFilter();
};

window.clearSearch = () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    currentPage = 1;
    renderDbReportsWithFilter();
};

function renderDbReportsWithFilter() {
    const searchVal = document.getElementById("searchInput")?.value.toLowerCase() || "";

    let displayData = fetchedReports;
    if (searchVal) {
        displayData = fetchedReports.filter(r =>
            (r.jobNo || "").toLowerCase().includes(searchVal) ||
            (r.buyer || "").toLowerCase().includes(searchVal) ||
            (r.wo || "").toLowerCase().includes(searchVal)
        );
    }

    if (!dbReportTable) return;
    dbReportTable.innerHTML = "";

    const totalItems = displayData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Adjust Page
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageData = displayData.slice(startIdx, endIdx);

    // Update Counts / Pagination UI
    if (dbTotalCount) {
        if (totalItems === 0) {
            dbTotalCount.innerHTML = "No entries found.";
        } else {
            dbTotalCount.innerHTML = `
                <div class="d-flex justify-content-between align-items-center w-100">
                    <div>Showing ${startIdx + 1} to ${Math.min(endIdx, totalItems)} of ${totalItems} entries</div>
                    <nav>
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                                <button class="page-link" onclick="changePage(${currentPage - 1})">Previous</button>
                            </li>
                            <li class="page-item disabled"><span class="page-link">Page ${currentPage} of ${totalPages}</span></li>
                            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                                <button class="page-link" onclick="changePage(${currentPage + 1})">Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>
            `;
        }
    }

    if (pageData.length === 0) {
        dbReportTable.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No matches found.</td></tr>';
        return;
    }

    pageData.forEach((r, index) => {
        const tr = document.createElement("tr");
        const realSL = startIdx + index + 1;
        const isEditable = r.editable === true;

        let dateStr = "-";
        if (r.submittedAt) {
            const date = new Date(r.submittedAt);
            if (!isNaN(date)) dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        tr.innerHTML = `
            <td>${realSL}</td>
            <td class="fw-bold text-primary text-nowrap">${r.jobNo}</td>
            <td>
                ${isEditable
                ? `<input type="text" class="form-control" value="${r.buyer || ''}" data-db-field="buyer">`
                : (r.buyer || '-')}
            </td>
            <td>
                ${isEditable
                ? `<input type="text" class="form-control" value="${r.wo || ''}" data-db-field="wo">`
                : (r.wo || '-')}
            </td>
            <td>
                ${isEditable
                ? `<select class="form-select" data-db-field="status">
                        <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Approved" ${r.status === 'Approved' ? 'selected' : ''}>Approved</option>
                        <option value="Rejected" ${r.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                       </select>`
                : `<span class="badge ${getStatusBadge(r.status)}">${r.status}</span>`}
            </td>
            <td class="small text-muted">
                ${isEditable
                ? `<input type="text" class="form-control" value="${r.comments || ''}" data-db-field="comments">`
                : (r.comments || '-')}
            </td>
            <td class="small text-secondary">${dateStr}</td>
            <td class="text-end">
                <div class="row-actions">
                    ${isEditable
                ? `<button class="btn-gms-row btn-gms-row-save" onclick="saveDbRow('${r.id}')">Save</button>`
                : `<button class="btn-gms-row btn-gms-row-edit" onclick="editDbRow('${r.id}')">Edit</button>`
            }
                    <button class="btn-gms-row btn-gms-row-delete" onclick="deleteDbRow('${r.id}')">Delete</button>
                </div>
            </td>
        `;
        dbReportTable.appendChild(tr);
    });
}


// --- Database Actions ---
window.deleteDbRow = function (id) {
    showConfirm("Permanently delete this report?", () => {
        db.collection(REPORTS_COLLECTION).doc(id).delete()
            .then(() => {
                showToast("Report deleted!", "danger");
                loadReportsFromFirestore();
            })
            .catch(err => showToast("Error: " + err.message, "danger"));
    });
};

window.editDbRow = function (id) {
    const report = fetchedReports.find(r => r.id === id);
    if (report) {
        report.editable = true;
        renderDbReportsWithFilter();
    }
};

window.saveDbRow = function (id) {
    const report = fetchedReports.find(r => r.id === id);
    if (!report) return;

    const rowBtn = document.querySelector(`button[onclick="saveDbRow('${id}')"]`);
    if (!rowBtn) return;
    const row = rowBtn.closest("tr");
    const updates = {};

    row.querySelectorAll("[data-db-field]").forEach(el => {
        updates[el.dataset.dbField] = el.value.trim();
    });

    // Update Local
    Object.assign(report, updates);
    report.editable = false;
    renderDbReportsWithFilter();

    // Update FireStore
    db.collection(REPORTS_COLLECTION).doc(id).update(updates)
        .then(() => showToast("Updated successfully!", "success"))
        .catch(err => {
            console.error("Update error:", err);
            showToast("Update failed: " + err.message, "danger");
            loadReportsFromFirestore(); // Revert on fail
        });
};

// ==========================================
// UTILS & UI HELPERS
// ==========================================
function getStatusBadge(status) {
    if (status === 'Approved') return 'badge-gms badge-approved';
    if (status === 'Rejected') return 'badge-gms badge-rejected';
    return 'badge-gms badge-pending';
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    if (toastEl && toastMessage) {
        toastMessage.textContent = message;
        toastEl.className = `toast align-items-center text-white border-0 bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'success'}`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

let confirmCallback = null;
function showConfirm(message, callback) {
    const modalEl = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmMessage');
    const btnEl = document.getElementById('confirmBtnAction');

    if (!modalEl) {
        if (confirm(message)) callback();
        return;
    }

    msgEl.textContent = message;
    confirmCallback = callback;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const newBtn = btnEl.cloneNode(true);
    btnEl.parentNode.replaceChild(newBtn, btnEl);
    newBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        bootstrap.Modal.getInstance(modalEl).hide();
    });
}

// --- Tools ---
function printDbReport() { /* ... kept simple ... */ window.print(); }
function exportDbExcel() {
    if (fetchedReports.length === 0) return showToast("No data", "warning");
    const data = [["Job No", "Buyer", "WO", "Status", "Comments", "Submitted At"]];
    fetchedReports.forEach(r => data.push([r.jobNo, r.buyer, r.wo, r.status, r.comments, r.submittedAt]));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "DB Report");
    XLSX.writeFile(wb, "db_report.xlsx");
}
function copyDbToClipboard() {
    if (fetchedReports.length === 0) {
        showToast("No data to copy", "warning");
        return;
    }
    let text = "Job No\tBuyer\tWO\tStatus\tComments\n";
    fetchedReports.forEach(r => {
        text += `${r.jobNo}\t${r.buyer}\t${r.wo}\t${r.status}\t${r.comments}\n`;
    });
    navigator.clipboard.writeText(text)
        .then(() => showToast("Copied to clipboard!", "success"))
        .catch(err => showToast("Failed to copy: " + err, "danger"));
}

// ========================================== 
// WHATSAPP SHARING
// ========================================== 
const WAS_CONTACTS = [
    // { name: "Farid Vaia", number: "01984411753" },
    { name: "Rajib Vaia", number: "01738601614" },
    { name: "Shakil Vaia", number: "01757461477" },
    { name: "Aziz Vaia", number: "01798442258" },
    { name: "Sabbir Vaia", number: "01713141291" },
    { name: "Aminul Vaia", number: "01618941814" }
];

function openWhatsappModal() {
    const selected = drafts.filter(d => d.selected);
    if (selected.length === 0) {
        showToast("Please select jobs to share first!", "warning");
        return;
    }

    const contactListEl = document.getElementById("waContactList");
    if (!contactListEl) return;

    // UI FIX: Only show name, number is hidden but stored in radio value
    contactListEl.innerHTML = WAS_CONTACTS.map((c, i) => `
        <label class="list-group-item d-flex align-items-center gap-3 py-3 border-0 rounded mb-2 bg-light bg-opacity-50" style="cursor: pointer;">
            <input class="form-check-input flex-shrink-0" type="radio" name="waContact" value="${c.number}" ${i === 0 ? 'checked' : ''}>
            <div class="d-flex align-items-center gap-3">
                <div class="bg-success bg-opacity-10 text-success p-2 rounded-circle">
                    <i class="fas fa-user"></i>
                </div>
                <div>
                   <div class="fw-bold">${c.name}</div>
                   <!-- Number hidden as per user request -->
                </div>
            </div>
        </label>
    `).join("");

    const modal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    modal.show();
}

function sendWhatsAppMessage() {
    const selected = drafts.filter(d => d.selected);
    const selectedRadio = document.querySelector('input[name="waContact"]:checked');

    if (!selectedRadio) {
        showToast("Please select a contact.", "warning");
        return;
    }

    let number = selectedRadio.value.replace(/\D/g, '');
    // Auto-detect Bangladesh local numbers and add country code
    if (number.length === 11 && number.startsWith('0')) {
        number = '88' + number;
    }

    // Use shared text generation
    const textToSend = getSmartDraftText(selected, false);
    const encodedText = encodeURIComponent(textToSend);

    // Using api.whatsapp.com for better text box population across devices
    const waUrl = `https://api.whatsapp.com/send?phone=${number}&text=${encodedText}`;

    window.open(waUrl, '_blank');

    // Close modal
    const modalEl = document.getElementById('whatsappModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
}