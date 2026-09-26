// POST /api/orders — place a cash-on-delivery order.
// Body: { customer: { name, phone, email?, address, note? }, items: [{ id, qty }] }
// Prices and totals are computed in the database (create_order), never trusted from the client.
import { handler, supabase, text, HttpError } from "./_supabase.js";

const PHONE_RE = /^(\+?84|0)\d{9,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default handler("POST", async (body) => {
  const c = body.customer || {};
  const customer = {
    name: text(c.name, { max: 100, required: true, field: "họ tên" }),
    phone: text(c.phone, { max: 20, required: true, field: "số điện thoại" }).replace(/[\s.-]/g, ""),
    email: text(c.email, { max: 120 }),
    address: text(c.address, { max: 300, required: true, field: "địa chỉ" }),
    note: text(c.note, { max: 500 }),
  };
  if (!PHONE_RE.test(customer.phone)) throw new HttpError(400, "Số điện thoại không hợp lệ");
  if (customer.email && !EMAIL_RE.test(customer.email)) throw new HttpError(400, "Email không hợp lệ");

  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) {
    throw new HttpError(400, "Giỏ hàng trống hoặc không hợp lệ");
  }
  const items = body.items.map((i) => ({ id: text(i?.id, { max: 60 }), qty: Number(i?.qty) }));
  if (items.some((i) => !i.id || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20)) {
    throw new HttpError(400, "Số lượng sản phẩm không hợp lệ");
  }

  try {
    const [row] = await supabase("rpc/create_order", { method: "POST", body: { p_customer: customer, p_items: items } });
    return { code: row.order_code, total: row.order_total };
  } catch (err) {
    if (String(err.message).startsWith("PRODUCT_UNAVAILABLE")) {
      throw new HttpError(409, "Một số sản phẩm trong giỏ đã ngừng bán, vui lòng tải lại trang.");
    }
    throw err;
  }
});
