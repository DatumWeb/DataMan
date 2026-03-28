document.getElementById("ping").addEventListener("click", async () => {
  const el = document.getElementById("ping-result");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({ type: "PING" });
    el.textContent = res?.ok ? "Background replied OK." : String(res);
  } catch (e) {
    el.textContent = e?.message || String(e);
  }
});
