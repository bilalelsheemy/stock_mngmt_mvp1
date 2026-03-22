const STORAGE_KEY = "sara-bags-v1";
const state = loadState();

const els = {
  bagForm: document.getElementById("bagForm"),
  bagId: document.getElementById("bagId"),
  brand: document.getElementById("brand"),
  modelName: document.getElementById("modelName"),
  color: document.getElementById("color"),
  openingStock: document.getElementById("openingStock"),
  minimumStock: document.getElementById("minimumStock"),
  notes: document.getElementById("notes"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  movementForm: document.getElementById("movementForm"),
  movementBagId: document.getElementById("movementBagId"),
  movementType: document.getElementById("movementType"),
  movementQty: document.getElementById("movementQty"),
  movementDate: document.getElementById("movementDate"),
  movementNote: document.getElementById("movementNote"),
  inventoryTableBody: document.getElementById("inventoryTableBody"),
  historyTableBody: document.getElementById("historyTableBody"),
  searchInput: document.getElementById("searchInput"),
  brandFilter: document.getElementById("brandFilter"),
  totalItems: document.getElementById("totalItems"),
  totalPieces: document.getElementById("totalPieces"),
  lowStockCount: document.getElementById("lowStockCount"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  seedDataBtn: document.getElementById("seedDataBtn"),
};

els.movementDate.value = new Date().toISOString().slice(0, 10);
els.bagForm.addEventListener("submit", onSaveBag);
els.resetFormBtn.addEventListener("click", resetBagForm);
els.movementForm.addEventListener("submit", onAddMovement);
els.searchInput.addEventListener("input", render);
els.brandFilter.addEventListener("change", render);
els.exportBtn.addEventListener("click", exportData);
els.importInput.addEventListener("change", importData);
els.seedDataBtn.addEventListener("click", seedData);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { bags: [], movements: [] };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function bagLabel(b) {
  return `${b.brand} - ${b.modelName}${b.color ? " - " + b.color : ""}`;
}

function onSaveBag(e) {
  e.preventDefault();
  const existing = state.bags.find(b => b.id === els.bagId.value);
  const openingStock = Number(els.openingStock.value || 0);
  const bag = {
    id: existing?.id || uid(),
    brand: els.brand.value.trim(),
    modelName: els.modelName.value.trim(),
    color: els.color.value.trim(),
    quantity: existing ? existing.quantity : openingStock,
    minimumStock: Number(els.minimumStock.value || 0),
    notes: els.notes.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (!bag.brand || !bag.modelName) return;

  if (existing) {
    Object.assign(existing, bag);
  } else {
    state.bags.push(bag);
    if (openingStock > 0) {
      state.movements.unshift({
        id: uid(),
        bagId: bag.id,
        type: "IN",
        quantity: openingStock,
        date: new Date().toISOString().slice(0, 10),
        note: "Opening stock"
      });
    }
  }
  saveState();
  resetBagForm();
  render();
}

function onAddMovement(e) {
  e.preventDefault();
  const bag = state.bags.find(b => b.id === els.movementBagId.value);
  if (!bag) return;
  const qty = Number(els.movementQty.value);
  const type = els.movementType.value;
  if (type === "OUT" && qty > bag.quantity) {
    alert("Cannot remove more pieces than current stock.");
    return;
  }
  bag.quantity += type === "IN" ? qty : -qty;
  state.movements.unshift({
    id: uid(), bagId: bag.id, type, quantity: qty,
    date: els.movementDate.value, note: els.movementNote.value.trim()
  });
  saveState();
  els.movementForm.reset();
  els.movementDate.value = new Date().toISOString().slice(0, 10);
  render();
}

function resetBagForm() {
  els.bagForm.reset();
  els.bagId.value = "";
  els.openingStock.value = 0;
  els.minimumStock.value = 0;
}

function render() {
  renderStats();
  renderBagOptions();
  renderBrandFilter();
  renderInventory();
  renderHistory();
}
function renderStats() {
  els.totalItems.textContent = state.bags.length;
  els.totalPieces.textContent = state.bags.reduce((sum, b) => sum + b.quantity, 0);
  els.lowStockCount.textContent = state.bags.filter(b => b.quantity <= b.minimumStock).length;
}
function renderBagOptions() {
  const current = els.movementBagId.value;
  els.movementBagId.innerHTML = '<option value="">Select a bag</option>' +
    state.bags.slice().sort((a,b)=>a.brand.localeCompare(b.brand)||a.modelName.localeCompare(b.modelName))
      .map(b => `<option value="${b.id}">${escapeHtml(bagLabel(b))}</option>`).join("");
  els.movementBagId.value = current;
}
function renderBrandFilter() {
  const brands = [...new Set(state.bags.map(b => b.brand))].sort();
  const current = els.brandFilter.value;
  els.brandFilter.innerHTML = '<option value="ALL">All brands</option>' +
    brands.map(brand => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`).join("");
  if (brands.includes(current)) els.brandFilter.value = current;
}
function getFilteredBags() {
  const q = els.searchInput.value.trim().toLowerCase();
  const brand = els.brandFilter.value;
  return state.bags.filter(b => {
    const matchesBrand = brand === "ALL" || b.brand === brand;
    const hay = `${b.brand} ${b.modelName} ${b.color}`.toLowerCase();
    return matchesBrand && (!q || hay.includes(q));
  }).sort((a,b)=>a.brand.localeCompare(b.brand)||a.modelName.localeCompare(b.modelName));
}
function renderInventory() {
  const bags = getFilteredBags();
  els.inventoryTableBody.innerHTML = bags.length ? bags.map(b => `
    <tr>
      <td>${escapeHtml(b.brand)}</td>
      <td>${escapeHtml(b.modelName)}</td>
      <td>${escapeHtml(b.color || "-")}</td>
      <td>${b.quantity}</td>
      <td>${b.minimumStock}</td>
      <td><span class="badge ${b.quantity <= b.minimumStock ? "low" : "ok"}">${b.quantity <= b.minimumStock ? "Low stock" : "OK"}</span></td>
      <td>
        <button class="link-btn" onclick="editBag('${b.id}')">Edit</button>
        <button class="danger-btn" onclick="deleteBag('${b.id}')">Delete</button>
      </td>
    </tr>`).join("") : '<tr><td colspan="7">No bags found.</td></tr>';
}
function renderHistory() {
  els.historyTableBody.innerHTML = state.movements.map(m => {
    const bag = state.bags.find(b => b.id === m.bagId);
    return `<tr>
      <td>${escapeHtml(m.date)}</td>
      <td>${bag ? escapeHtml(bagLabel(bag)) : "Deleted bag"}</td>
      <td>${escapeHtml(m.type)}</td>
      <td>${m.quantity}</td>
      <td>${escapeHtml(m.note || "-")}</td>
      <td><button class="danger-btn" onclick="deleteMovement('${m.id}')">Delete</button></td>
    </tr>`;
  }).join("") || '<tr><td colspan="6">No movements yet.</td></tr>';
}
function editBag(id) {
  const b = state.bags.find(x => x.id === id);
  if (!b) return;
  els.bagId.value = b.id;
  els.brand.value = b.brand;
  els.modelName.value = b.modelName;
  els.color.value = b.color || "";
  els.openingStock.value = 0;
  els.minimumStock.value = b.minimumStock;
  els.notes.value = b.notes || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function deleteBag(id) {
  if (!confirm("Delete this bag and all its movements?")) return;
  state.bags = state.bags.filter(b => b.id !== id);
  state.movements = state.movements.filter(m => m.bagId !== id);
  saveState(); render();
}
function deleteMovement(id) {
  const movement = state.movements.find(m => m.id === id);
  if (!movement) return;
  const bag = state.bags.find(b => b.id === movement.bagId);
  if (bag) bag.quantity += movement.type === "IN" ? -movement.quantity : movement.quantity;
  state.movements = state.movements.filter(m => m.id !== id);
  saveState(); render();
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sara-bags-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.bags) || !Array.isArray(parsed.movements)) throw new Error();
      state.bags = parsed.bags; state.movements = parsed.movements; saveState(); render();
      alert("Data imported successfully.");
    } catch { alert("Invalid JSON file."); }
  };
  reader.readAsText(file);
}
function seedData() {
  if (state.bags.length && !confirm("This will replace your current data with demo data.")) return;
  state.bags = [
    { id: uid(), brand: "Michael Kors", modelName: "Jet Set Tote", color: "Black", quantity: 8, minimumStock: 3, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), brand: "Coach", modelName: "Tabby Shoulder Bag", color: "Brown", quantity: 2, minimumStock: 2, notes: "", createdAt: new Date().toISOString() },
    { id: uid(), brand: "Guess", modelName: "Noelle Crossbody", color: "Beige", quantity: 5, minimumStock: 1, notes: "", createdAt: new Date().toISOString() }
  ];
  state.movements = state.bags.map(b => ({ id: uid(), bagId: b.id, type: "IN", quantity: b.quantity, date: new Date().toISOString().slice(0,10), note: "Opening stock" }));
  saveState(); render();
}
function escapeHtml(value) {
  return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
window.editBag = editBag;
window.deleteBag = deleteBag;
window.deleteMovement = deleteMovement;
render();
