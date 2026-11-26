/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby2Dh2L3urv3gZTujwkHqHhPvgz50NVVbxQSpNHYnJ268YwkbXfoyvA_HM2l_X_StwU/exec";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlZrI_9E3yWV8SOFlawhSQcxxmrgbldnfWi5GUvF5eg9ME2L3WMmF9JMykoUBS9JMVPzu5chnm5fx3/pub?gid=0&single=true&output=csv";

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" },
];

const MOOD_LABELS = {
  fresh: "Fresh",
  sweet: "Sweet",
  confident: "Confident",
  romance: "Romance",
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้า product.html
   ========================================================== */

function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const list = document.getElementById("product-list");
  let products = [];

  const params = new URLSearchParams(window.location.search);
  const requested = (params.get("mood") || "all").toLowerCase();
  let currentMood = MOODS.some((m) => m.key === requested) ? requested : "all";

  function renderFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = "";
    MOODS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = m.label;
      btn.dataset.mood = m.key;
      if (m.key === currentMood) btn.classList.add("is-active");
      btn.addEventListener("click", () => {
        currentMood = m.key;
        updateActiveButton();
        renderProducts();
        syncUrl();
      });
      filterBar.appendChild(btn);
    });
  }

  function updateActiveButton() {
    if (!filterBar) return;
    filterBar.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.mood === currentMood);
    });
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (currentMood === "all") url.searchParams.delete("mood");
    else url.searchParams.set("mood", currentMood);
    window.history.replaceState(null, "", url);
  }

  function buildOrderLink(p) {
    const itemName = p.size ? p.name + " " + p.size : p.name;
    return (
      "order.html?item=" +
      encodeURIComponent(itemName) +
      "&price=" +
      encodeURIComponent(p.price)
    );
  }

  function createCard(p) {
    const card = document.createElement("article");
    card.className = "product-card mood-" + p.mood;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    thumb.appendChild(img);

    const body = document.createElement("div");
    body.className = "body";

    const meta = document.createElement("div");
    meta.className = "meta";
    const dot = document.createElement("span");
    dot.className = "mood-dot " + p.mood;
    meta.appendChild(dot);
    meta.appendChild(
      document.createTextNode(
        (MOOD_LABELS[p.mood] || p.mood) + (p.size ? " · " + p.size : "")
      )
    );

    const title = document.createElement("h3");
    title.textContent = p.name;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = Number(p.price).toLocaleString("th-TH") + " ";
    const unit = document.createElement("small");
    unit.textContent = "บาท";
    price.appendChild(unit);

    const buy = document.createElement("a");
    buy.className = "btn btn-bronze btn-block";
    buy.href = buildOrderLink(p);
    buy.textContent = "สั่งซื้อ";

    body.append(meta, title, price, buy);
    card.append(thumb, body);
    return card;
  }

  function renderProducts() {
    list.innerHTML = "";
    const shown =
      currentMood === "all"
        ? products
        : products.filter((p) => p.mood === currentMood);

    if (shown.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-center";
      empty.textContent = "ยังไม่มีสินค้าในหมวดนี้";
      list.appendChild(empty);
      return;
    }
    shown.forEach((p) => list.appendChild(createCard(p)));
  }

  renderFilterBar();

  fetch("products.json")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then((data) => {
      products = data;
      renderProducts();
    })
    .catch((error) => {
      console.error(error);
      list.innerHTML = "";
      const msg = document.createElement("p");
      msg.className = "text-center";
      msg.textContent = "โหลดรายการสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง";
      list.appendChild(msg);
    });
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */

function initOrderPage() {
  const form = document.getElementById("orderForm");
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  // เติมค่าจาก URL parameter ทันที (ทั้งช่อง items และ total)
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");

  if (item !== null && itemsInput) itemsInput.value = item;
  if (price !== null && totalInput) totalInput.value = price;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value,
      contact: document.getElementById("contact").value,
      items: document.getElementById("items").value,
      total: document.getElementById("total").value,
      note: document.getElementById("note").value,
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */

// parse CSV เอง: รองรับเครื่องหมายคำพูด, "" (quote ซ้อน), คอมมาและขึ้นบรรทัดใหม่ในช่อง
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  const COLS = 6;

  function showMessage(text) {
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = COLS;
    td.textContent = text;
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage("กำลังโหลดข้อมูล...");

  // ใส่ timestamp กัน browser cache
  const url = SHEET_CSV_URL + "&t=" + Date.now();

  fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then((text) => {
      const rows = parseCSV(text)
        .slice(1) // ข้ามแถวหัวตาราง
        .filter((r) => r.some((cell) => cell.trim() !== ""));

      if (rows.length === 0) {
        showMessage("ยังไม่มีรายการสั่งซื้อ");
        return;
      }

      // ล่าสุดขึ้นก่อน (ชีตเพิ่มแถวต่อท้ายตามลำดับเวลา จึงกลับลำดับได้เลย)
      rows.reverse();

      tbody.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        for (let i = 0; i < COLS; i++) {
          const td = document.createElement("td");
          td.textContent = r[i] !== undefined ? r[i] : ""; // textContent กัน HTML injection
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error(error);
      showMessage("โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง");
    });
}
