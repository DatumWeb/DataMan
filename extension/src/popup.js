function show(el, text) {
  el.textContent = text;
}

document.getElementById("ping").addEventListener("click", async () => {
  const el = document.getElementById("ping-result");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({ type: "PING" });
    show(el, res?.ok ? "Background replied OK." : String(res));
  } catch (e) {
    show(el, e?.message || String(e));
  }
});

document.getElementById("summary").addEventListener("click", async () => {
  const el = document.getElementById("summary-out");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE_SUMMARY" });
    if (res?.ok && res.summary) {
      el.textContent = JSON.stringify(res.summary, null, 2);
    } else {
      el.textContent = JSON.stringify(res, null, 2);
    }
  } catch (e) {
    el.textContent = e?.message || String(e);
  }
});

async function appendSample(collectionMode) {
  const el = document.getElementById("sample-result");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({
      type: "APPEND_SAMPLE_EVENT",
      collectionMode
    });
    if (res?.ok && res.summary) {
      el.textContent = `OK — events now: ${res.summary.eventCount}`;
    } else {
      el.textContent = JSON.stringify(res);
    }
  } catch (e) {
    el.textContent = e?.message || String(e);
  }
}

document.getElementById("sample-passive").addEventListener("click", () => {
  appendSample("passive");
});

document.getElementById("sample-active").addEventListener("click", () => {
  appendSample("active_extract");
});
