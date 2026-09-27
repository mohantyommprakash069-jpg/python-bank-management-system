const money = (n) => `$${Number(n).toLocaleString("en-US")}`;

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === name));
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) switchTab(btn.dataset.tab);
});

function renderCard(target, ok, title, rows) {
  const el = document.querySelector(`[data-result="${target}"]`);
  const rowsHtml = rows.map(([label, value]) => `<div class="row"><span>${label}</span><span>${value}</span></div>`).join("");
  el.innerHTML = `<div class="card ${ok ? "ok" : "err"}"><div class="card-title">${title}</div>${rowsHtml}</div>`;
}

function renderStatement(target, account) {
  const el = document.querySelector(`[data-result="${target}"]`);
  el.innerHTML = `
    <div class="card ok">
      <div class="card-title">Statement</div>
      <div class="balance">${money(account.balance)}</div>
      <div class="row"><span>Name</span><span>${account.name}</span></div>
      <div class="row"><span>Age</span><span>${account.age}</span></div>
      <div class="row"><span>Email</span><span>${account.email}</span></div>
      <div class="row"><span>Account No.</span><span>${account.accountNo}</span></div>
    </div>`;
}

async function callApi(path, options) {
  const res = await fetch(path, options);
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

function bind(formId, handler) {
  const form = document.getElementById(formId);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector("button");
    const target = form.id.replace("form-", "");
    button.disabled = true;
    try {
      await handler(new FormData(form), target);
      if (form.id !== "form-open" && form.id !== "form-close") {
        // keep account number for convenience, clear sensitive fields only
      }
    } catch (err) {
      renderCard(target, false, "Declined", [["Reason", err.message]]);
    } finally {
      button.disabled = false;
    }
  });
}

bind("form-open", async (fd, target) => {
  const payload = {
    name: fd.get("name"),
    age: Number(fd.get("age")),
    email: fd.get("email"),
    pin: Number(fd.get("pin")),
  };
  const account = await callApi("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  renderCard(target, true, "Account opened — note your account number", [
    ["Account No.", account.accountNo],
    ["Name", account.name],
    ["Balance", money(account.balance)],
  ]);
  document.getElementById("form-open").reset();
});

bind("form-deposit", async (fd, target) => {
  const accountNo = fd.get("accountNo");
  const account = await callApi(`/api/account/${encodeURIComponent(accountNo)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: Number(fd.get("pin")), action: "deposit", amount: Number(fd.get("amount")) }),
  });
  renderCard(target, true, "Deposit confirmed", [["New balance", money(account.balance)]]);
});

bind("form-withdraw", async (fd, target) => {
  const accountNo = fd.get("accountNo");
  const account = await callApi(`/api/account/${encodeURIComponent(accountNo)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: Number(fd.get("pin")), action: "withdraw", amount: Number(fd.get("amount")) }),
  });
  renderCard(target, true, "Withdrawal confirmed", [["New balance", money(account.balance)]]);
});

bind("form-statement", async (fd, target) => {
  const accountNo = fd.get("accountNo");
  const account = await callApi(`/api/account/${encodeURIComponent(accountNo)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: Number(fd.get("pin")), action: "view" }),
  });
  renderStatement(target, account);
});

bind("form-update", async (fd, target) => {
  const accountNo = fd.get("accountNo");
  const account = await callApi(`/api/account/${encodeURIComponent(accountNo)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pin: Number(fd.get("pin")),
      name: fd.get("name"),
      email: fd.get("email"),
      newPin: fd.get("newPin"),
    }),
  });
  renderCard(target, true, "Details updated", [
    ["Name", account.name],
    ["Email", account.email],
  ]);
});

bind("form-close", async (fd, target) => {
  const accountNo = fd.get("accountNo");
  if (!window.confirm(`Close account ${accountNo}? This cannot be undone.`)) {
    return;
  }
  await callApi(`/api/account/${encodeURIComponent(accountNo)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: Number(fd.get("pin")) }),
  });
  renderCard(target, true, "Account closed", [["Account No.", accountNo]]);
  document.getElementById("form-close").reset();
});
