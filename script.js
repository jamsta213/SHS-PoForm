let currentItemIndex = 1;
const maxItems = 10;

window.onload = () => {
  generateItemPages();
  loadFormData();
};

async function loadFormData() {
  try {
    const res = await fetch('/getFormData');
    const data = await res.json();
    const bSel = document.getElementById('budgetSelect');
    const sSel = document.getElementById('supplierSelect');
    (data.budgets || []).forEach(b => bSel.add(new Option(b, b)));
    (data.suppliers || []).forEach(s => sSel.add(new Option(s, s)));
    sSel.add(new Option("Other", "other"));
  } catch (err) {
    console.error("Failed to load form data:", err);
    alert("Could not load budgets/suppliers. Please refresh the page.");
  }
}

function validatePage1() {
  const name = document.getElementById('userName');
  const budget = document.getElementById('budgetSelect');
  const supplier = document.getElementById('supplierSelect');
  const other = document.getElementById('otherSupplierText');
  if (!name.reportValidity() || !budget.reportValidity() || !supplier.reportValidity()) return;
  if (supplier.value === 'other' && !other.value.trim()) {
    other.reportValidity();
    return;
  }
  nextStep('step-item-1');
}

function generateItemPages() {
  const container = document.getElementById('item-steps-container');
  for (let i = 1; i <= maxItems; i++) {
    const div = document.createElement('div');
    div.id = `step-item-${i}`;
    div.className = 'form-step';
    div.innerHTML = `
      <h1>Item ${i}</h1>
      <div class="field">
        <label>Item Name</label>
        <span class="desc">Or description of item</span>
        <input type="text" id="itemName-${i}" required>
      </div>
      <div class="field">
        <label>Product Code</label>
        <span class="desc">For catalogue orders (eg TTS/KCS/GLS)</span>
        <input type="text" id="itemCode-${i}">
      </div>
      <div class="field">
        <label>Item Link</label>
        <span class="desc">For all orders you MUST enter the link. If no link just enter na.com</span>
        <input type="text" id="itemLink-${i}" placeholder="e.g. na.com or www.google.com" required>
      </div>
      <div class="field">
        <label>Price</label>
        <span class="desc">For eg if the item is £1.50 type in 1.50, for 59p type 0.59.</span>
        <div class="currency-wrapper">
          <span class="currency-symbol">£</span>
          <input type="number" id="itemPrice-${i}" step="0.01" min="0.01" onblur="formatPrice(this)" required>
        </div>
      </div>
      <div class="field">
        <label>Quantity</label>
        <input type="number" id="itemQty-${i}" step="1" min="1" value="1" required>
      </div>
      <div class="field">
        <label>Do you have more items to add?</label>
        <select id="hasMore-${i}">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
      <button type="button" class="btn-next" onclick="handleItemNext(${i})">Next Step</button>
      <button type="button" class="btn-back" onclick="prevStep()">Back</button>
    `;
    container.appendChild(div);
  }
}

function formatPrice(input) {
  if (input.value !== "") {
    let val = parseFloat(input.value);
    if (!isNaN(val)) input.value = val.toFixed(2);
  }
}

function toggleOtherSupplier(el) {
  const other = document.getElementById('otherSupplierText');
  other.style.display = el.value === 'other' ? 'block' : 'none';
  other.required = el.value === 'other';
}

function handleItemNext(num) {
  const linkInput = document.getElementById(`itemLink-${num}`);
  linkInput.setCustomValidity("");

  const inputs = document.querySelectorAll(`#step-item-${num} [required]`);
  let valid = true;
  inputs.forEach(input => { if (!input.reportValidity()) valid = false; });
  if (!valid) return;

  const linkVal = linkInput.value.trim();
  const linkPattern = /\.[a-z]{2,}/i;
  if (!linkPattern.test(linkVal) || linkVal.length < 4) {
    linkInput.setCustomValidity("Please enter a valid web link (e.g. na.com or www.google.com)");
    linkInput.reportValidity();
    return;
  }

  const more = document.getElementById(`hasMore-${num}`).value;
  if (more === 'yes' && num < maxItems) {
    currentItemIndex = num + 1;
    nextStep(`step-item-${num + 1}`);
  } else {
    currentItemIndex = num;
    showSummary();
    nextStep('step-confirm');
  }
}

function showSummary() {
  const name = document.getElementById('userName').value;
  const budget = document.getElementById('budgetSelect').value;
  const sEl = document.getElementById('supplierSelect');
  const supplier = sEl.value === 'other' ? document.getElementById('otherSupplierText').value : sEl.value;

  let grandTotal = 0;
  let html = `<b>Name:</b> ${name}<br><b>Budget:</b> ${budget}<br><b>Supplier:</b> ${supplier}<hr>`;

  for (let i = 1; i <= currentItemIndex; i++) {
    const itemName = document.getElementById(`itemName-${i}`).value;
    const qty = parseInt(document.getElementById(`itemQty-${i}`).value) || 0;
    const price = parseFloat(document.getElementById(`itemPrice-${i}`).value) || 0;
    const itemTotal = qty * price;
    grandTotal += itemTotal;

    html += `<b>Item ${i}:</b> ${itemName}<br>`;
    html += `Qty: ${qty} x £${price.toFixed(2)} = <b>£${itemTotal.toFixed(2)}</b><br><br>`;
  }

  html += `<hr><b style="font-size: 20px; color: #2D5F3F;">Grand Total: £${grandTotal.toFixed(2)}</b>`;
  document.getElementById('previewArea').innerHTML = html;
}

function nextStep(id) {
  document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function prevStep() {
  const active = document.querySelector('.form-step.active');
  if (active.id === 'step-item-1') nextStep('step-details');
  else if (active.id.startsWith('step-item-')) {
    const num = parseInt(active.id.split('-').pop());
    nextStep(`step-item-${num - 1}`);
  } else if (active.id === 'step-confirm') {
    nextStep(`step-item-${currentItemIndex}`);
  }
}

document.addEventListener('input', function (e) {
  if (e.target.id && e.target.id.startsWith('itemLink-')) e.target.setCustomValidity("");
}, false);

async function submitForm() {
  const btn = document.getElementById('submitBtn');
  if (!document.getElementById('orderDesc').reportValidity()) return;
  btn.disabled = true; btn.textContent = 'Submitting...';

  const items = [];
  for (let i = 1; i <= 10; i++) {
    items.push({
      name: i <= currentItemIndex ? document.getElementById(`itemName-${i}`).value : "",
      code: i <= currentItemIndex ? document.getElementById(`itemCode-${i}`).value : "",
      link: i <= currentItemIndex ? document.getElementById(`itemLink-${i}`).value : "",
      price: i <= currentItemIndex ? document.getElementById(`itemPrice-${i}`).value : "",
      qty: i <= currentItemIndex ? document.getElementById(`itemQty-${i}`).value : ""
    });
  }

  const payload = {
    name: document.getElementById('userName').value,
    budget: document.getElementById('budgetSelect').value,
    supplier: document.getElementById('supplierSelect').value === 'other' ? document.getElementById('otherSupplierText').value : document.getElementById('supplierSelect').value,
    description: document.getElementById('orderDesc').value,
    comments: document.getElementById('comments').value,
    items: items
  };

  try {
    const res = await fetch('/submitPO', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || result.error) throw new Error(result.error || 'Submission failed');
    nextStep('step-success');
  } catch (err) {
    alert("Error: " + err.message);
    btn.disabled = false; btn.textContent = 'Submit Request';
  }
}
