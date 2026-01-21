const $ = (id) => document.getElementById(id);

const baseUrlEl = $("baseUrl");
const statusDot = $("statusDot");
const statusText = $("statusText");
const logEl = $("log");

const blogIdEl = $("blogId");
const titleEl = $("title");
const bodyEl = $("body");
const authorEl = $("author");

const listEl = $("list");

function apiBase() {
    return (baseUrlEl.value || "http://localhost:3000").replace(/\/+$/, "");
}

function log(message, data) {
    const ts = new Date().toLocaleTimeString();
    let text = `[${ts}] ${message}`;
    if (data !== undefined) {
        try { text += "\n" + JSON.stringify(data, null, 2); }
        catch { text += "\n" + String(data); }
    }
    logEl.textContent = text + "\n\n" + logEl.textContent;
}

function setStatus(kind, text) {
    statusDot.classList.remove("ok", "bad");
    if (kind === "ok") statusDot.classList.add("ok");
    if (kind === "bad") statusDot.classList.add("bad");
    statusText.textContent = text;
}

async function request(path, options = {}) {
    const url = apiBase() + path;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
    });

    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        data = await res.json().catch(() => null);
    } else {
        data = await res.text().catch(() => "");
    }

    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

function renderList(blogs) {
    listEl.innerHTML = "";
    if (!Array.isArray(blogs) || blogs.length === 0) {
        listEl.innerHTML = `<div class="item">
          <div class="title">Постов нет</div>
          <div class="small">Сделай POST /blogs, потом Refresh.</div>
        </div>`;
        return;
    }

    for (const b of blogs) {
        const id = b._id || "";
        const created = b.createdAt ? new Date(b.createdAt).toLocaleString() : "-";
        const updated = b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "-";
        const author = b.author || "Anonymous";

        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
          <div class="item-top">
            <div>
              <div class="title">${escapeHtml(b.title ?? "(no title)")}</div>
              <div class="meta">
                <span>Author: <b>${escapeHtml(author)}</b></span>
                <span>Created: ${escapeHtml(created)}</span>
                <span>Updated: ${escapeHtml(updated)}</span>
              </div>
            </div>
            <div class="mono" title="MongoDB _id">${escapeHtml(id)}</div>
          </div>

          <div>${escapeHtml((b.body ?? "")).slice(0, 240)}${(b.body && b.body.length > 240) ? "…" : ""}</div>

          <div class="item-actions">
            <button class="ghost" data-act="select" data-id="${id}">Select</button>
            <button class="ghost" data-act="fill" data-id="${id}">Load into form</button>
            <button class="danger" data-act="delete" data-id="${id}">Delete</button>
          </div>
        `;

        div.addEventListener("click", async (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            const act = btn.dataset.act;
            const blogId = btn.dataset.id;

            if (act === "select") {
                blogIdEl.value = blogId;
                log("Selected ID", { _id: blogId });
            }

            if (act === "fill") {
                try {
                    const one = await request(`/blogs/${blogId}`, { method: "GET" });
                    blogIdEl.value = blogId;
                    titleEl.value = one.title ?? "";
                    bodyEl.value = one.body ?? "";
                    authorEl.value = one.author ?? "";
                    log("Loaded blog into form", one);
                } catch (err) {
                    log(`Load failed (${err.status || "?"})`, err.data || err.message);
                }
            }

            if (act === "delete") {
                if (!confirm("Удалить этот пост?")) return;
                try {
                    const out = await request(`/blogs/${blogId}`, { method: "DELETE" });
                    log("Deleted", out);
                    await refresh();
                } catch (err) {
                    log(`Delete failed (${err.status || "?"})`, err.data || err.message);
                }
            }
        });

        listEl.appendChild(div);
    }
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function ping() {
    try {
        const data = await request(`/`, { method: "GET" });
        setStatus("ok", "API: OK");
        log("Ping OK (/)", data);
        return true;
    } catch (err) {
        setStatus("bad", "API: offline / CORS");
        log(`Ping failed (${err.status || "network"})`, err.data || err.message);
        return false;
    }
}

async function refresh() {
    try {
        const blogs = await request(`/blogs`, { method: "GET" });
        renderList(blogs);
        log("Fetched all blogs", { count: Array.isArray(blogs) ? blogs.length : 0 });
    } catch (err) {
        renderList([]);
        log(`GET /blogs failed (${err.status || "network"})`, err.data || err.message);
    }
}

function clearForm() {
    blogIdEl.value = "";
    titleEl.value = "";
    bodyEl.value = "";
    authorEl.value = "";
    log("Form cleared");
}

function readForm() {
    return {
        title: titleEl.value.trim(),
        body: bodyEl.value.trim(),
        author: authorEl.value.trim() || undefined,
    };
}

// Buttons
$("btnPing").addEventListener("click", ping);

$("btnRefresh").addEventListener("click", async () => {
    await ping();
    await refresh();
});

$("btnClear").addEventListener("click", clearForm);

$("btnCreate").addEventListener("click", async () => {
    const payload = readForm();
    try {
        const created = await request(`/blogs`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        blogIdEl.value = created._id || "";
        log("Created (POST /blogs)", created);
        await refresh();
    } catch (err) {
        log(`Create failed (${err.status || "network"})`, err.data || err.message);
    }
});

$("btnGetOne").addEventListener("click", async () => {
    const id = blogIdEl.value.trim();
    if (!id) return log("Please set Blog ID first");
    try {
        const one = await request(`/blogs/${id}`, { method: "GET" });
        log("Fetched one (GET /blogs/:id)", one);
    } catch (err) {
        log(`Get one failed (${err.status || "network"})`, err.data || err.message);
    }
});

$("btnUpdate").addEventListener("click", async () => {
    const id = blogIdEl.value.trim();
    if (!id) return log("Please set Blog ID first");
    const payload = readForm();
    try {
        const updated = await request(`/blogs/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
        log("Updated (PUT /blogs/:id)", updated);
        await refresh();
    } catch (err) {
        log(`Update failed (${err.status || "network"})`, err.data || err.message);
    }
});

$("btnDelete").addEventListener("click", async () => {
    const id = blogIdEl.value.trim();
    if (!id) return log("Please set Blog ID first");
    if (!confirm("Удалить этот пост по ID?")) return;
    try {
        const out = await request(`/blogs/${id}`, { method: "DELETE" });
        log("Deleted (DELETE /blogs/:id)", out);
        await refresh();
    } catch (err) {
        log(`Delete failed (${err.status || "network"})`, err.data || err.message);
    }
});

// Initial
(async function init() {
    await ping();
    await refresh();
})();