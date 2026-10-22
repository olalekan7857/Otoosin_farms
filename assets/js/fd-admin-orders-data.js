/* ==========================================================================
   O'Toosin Farms Admin — Order source boundary (Stage 4: Order Management)
   --------------------------------------------------------------------------
   Vanilla JS, no dependencies, no framework. Admin-scoped: never touches
   the customer cart store and never loads fresh-direct.js, so customer
   state cannot leak into the admin area.

   CANONICAL ORDER SHAPE (reused from the O'Toosin customer checkout in
   assets/js/otoosin-checkout.js, with the older FreshDirect snapshot
   fields still accepted):
     { id, status, placedAt, customer { name, phone, email },
       delivery { mode, address, city, state, landmark, instructions },
       items [{ productId, variantId, name, variantLabel, quantity,
                 unitPrice, lineTotal }],
       subtotal, total, deliveryFee, orderingMethod,
       payment { method, label, provider, reference, status, verified } }
   Order status vocabulary: "pending" | "failed" | "paid". "paid" renders
   as Paid ONLY when the
   snapshot itself carries payment.verified === true plus a reference
   (a backend-set flag) — nothing else can confer it. No new order model
   is introduced here.

   CURRENT SOURCE (frontend-only phase):
     - The customer checkout saves one snapshot to sessionStorage
       ("freshdirect_last_order"). getOrders() imports that snapshot into
       the store-kept record below (localStorage
       "freshdirect_admin_orders_v1") the first time it is seen, so orders
       placed in this browser appear here. Imported snapshots are never
       rewritten: item prices stay exactly as recorded at order time, and
       an admin status change never mutates item lines.
     - updateOrderStatus() validates the status, builds the backend-ready
       payload { orderId, status }, persists it through this same store,
       and reports the genuine result. Success means "saved in this
       browser" — never a database claim.

   DJANGO INTEGRATION (later stage, no order-UI rebuild needed):
     - Replace the bodies of getOrders()/getOrder()/updateOrderStatus()
       with API calls (GET orders, GET order by id, PATCH/PUT order
       status) that resolve/accept the SAME canonical shape and the SAME
       payload { orderId, status }.
     - Keep this file's public signatures so fd-admin-orders.js and
       fd-admin-order-detail.js are reused untouched. Do NOT hardcode
       endpoint URLs here.

   WHATSAPP: the store number below mirrors FRESH_DIRECT.whatsappNumber
   (assets/js/fresh-direct.js), which mirrors the future Django setting
   WHATSAPP_NUMBER. Keep the digits in sync; never add a second number.
   ========================================================================== */
(function () {
  "use strict";

  var STORE_KEY = "freshdirect_admin_orders_v1";
  var LAST_ORDER_KEY = "freshdirect_last_order";

  /* Central store number (digits only). A WhatsApp number saved on the
     Settings page (Stage 5 store record) wins; otherwise the shared
     customer config; otherwise the same digits as a last resort. Admin
     pages never load fresh-direct.js, so each fallback keeps the digits
     identical — never a second number. */
  function storeNumber() {
    try {
      if (
        window.FreshDirectAdminSettings &&
        typeof window.FreshDirectAdminSettings.getWhatsAppNumber === "function"
      ) {
        var saved = window.FreshDirectAdminSettings.getWhatsAppNumber();
        if (saved) {
          return saved;
        }
      }
    } catch (e) {
      /* fall through to the shared config */
    }
    try {
      if (
        window.FRESH_DIRECT &&
        typeof window.FRESH_DIRECT.whatsappNumber === "string" &&
        window.FRESH_DIRECT.whatsappNumber
      ) {
        return window.FRESH_DIRECT.whatsappNumber;
      }
    } catch (e) {
      /* fall through to the mirrored digits */
    }
    return "2349011058873";
  }

  /* Order statuses genuinely supported by the customer confirmation flow.
     No fulfillment workflow (confirmed/preparing/ready/…) is invented:
     until the backend defines one, the store admin works with these four. */
  var ALLOWED_STATUSES = ["pending", "paid", "failed"];

  /* ---------- Small local helpers (admin copies; no customer dep) ---------- */
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c];
    });
  }

  function fmtNaira(n) {
    var v = Number(n);
    if (!isFinite(v)) {
      v = 0;
    }
    return "\u20A6" + v.toLocaleString("en-NG");
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) {
      return "Date unavailable";
    }
    return d.toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function fmtDateFull(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.getTime())) {
      return "Date unavailable";
    }
    return d.toLocaleString("en-NG", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function asText(value) {
    return typeof value === "string" ? value : "";
  }

  function asQty(value) {
    var n = parseFloat(value);
    return isFinite(n) && n > 0 ? n : 1;
  }

  function asMoney(value, fallback) {
    var n = Number(value);
    if (isFinite(n) && n >= 0) {
      return n;
    }
    return fallback;
  }

  /* ---------- Storage ---------- */
  function localStore() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch (e) {
      /* private mode — callers treat this as unavailable */
    }
    return null;
  }

  function readStoreMap() {
    var store = localStore();
    if (!store) {
      return {};
    }
    try {
      var raw = store.getItem(STORE_KEY);
      if (!raw) {
        return {};
      }
      var data = JSON.parse(raw);
      var saved = (data && data.orders) || {};
      var out = {};
      var ids = Object.keys(saved);
      for (var i = 0; i < ids.length; i++) {
        var order = normalize(saved[ids[i]]);
        if (order) {
          out[order.id] = order;
        }
      }
      return out;
    } catch (e) {
      return {};
    }
  }

  function writeStoreMap(map) {
    var store = localStore();
    if (!store) {
      return false;
    }
    try {
      store.setItem(STORE_KEY, JSON.stringify({ v: 1, orders: map || {} }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function readSessionOrder() {
    try {
      if (!window.sessionStorage) {
        return null;
      }
      var raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
      if (!raw) {
        return null;
      }
      return normalize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  /* ---------- Normalization (checkout snapshot -> canonical order) ----------
     Accepts the exact stampOrder() snapshot. Also tolerates the older
     dashboard placeholder shape ({ ref, customer: "Name", total }) so a
     hand-kept record can never crash the UI — nothing is invented, only
     mapped. Returns null for anything without an id + item lines. */
  function normalize(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    var id = asText(raw.id) || asText(raw.ref);
    if (!id) {
      return null;
    }
    var itemsRaw = Array.isArray(raw.items) ? raw.items : [];
    var items = [];
    for (var i = 0; i < itemsRaw.length; i++) {
      var line = normalizeLine(itemsRaw[i]);
      if (line) {
        items.push(line);
      }
    }
    if (!items.length) {
      return null;
    }

    var customer = { name: "", phone: "", email: "" };
    if (typeof raw.customer === "string") {
      customer.name = raw.customer;
    } else if (raw.customer && typeof raw.customer === "object") {
      customer.name = asText(raw.customer.name);
      customer.phone = asText(raw.customer.phone);
      customer.email = asText(raw.customer.email);
    }

    var d = (raw.delivery && typeof raw.delivery === "object") ? raw.delivery : {};
    /* Checkout snapshots record a street address; there is no campus mode. */
    var mode = (asText(d.address) || asText(d.city) || asText(d.state))
      ? "address"
      : "";
    var delivery = {
      mode: mode,
      address: asText(d.address),
      city: asText(d.city),
      state: asText(d.state),
      landmark: asText(d.landmark),
      instructions: asText(d.instructions)
    };

    var linesTotal = 0;
    for (var j = 0; j < items.length; j++) {
      linesTotal += items[j].lineTotal;
    }
    var subtotal = asMoney(raw.subtotal, NaN);
    if (!isFinite(subtotal)) {
      subtotal = linesTotal;
    }
    /* The recorded total is the snapshot's own figure, never recalculated
       from today's catalog. Older placeholders carry `total` instead. */
    var total = asMoney(raw.total, NaN);
    if (!isFinite(total)) {
      total = subtotal;
    }

    var payment = {
      method: "",
      label: "",
      provider: "",
      reference: "",
      status: "unpaid",
      verified: false
    };
    if (raw.payment && typeof raw.payment === "object") {
      payment.method = asText(raw.payment.method);
      payment.label = asText(raw.payment.label);
      payment.provider = asText(raw.payment.provider);
      payment.reference = asText(raw.payment.reference);
      var ps = asText(raw.payment.status);
      payment.status =
        ps === "pending" || ps === "paid" || ps === "failed" ? ps : "unpaid";
      payment.verified = raw.payment.verified === true;
    } else if (typeof raw.paymentStatus === "string") {
      /* Legacy dashboard placeholder field. */
      var legacy = raw.paymentStatus;
      payment.status =
        legacy === "pending" || legacy === "paid" || legacy === "failed"
          ? legacy
          : "unpaid";
      payment.verified = legacy === "paid" && raw.orderStatus === "paid";
    }

    var status = asText(raw.status) || asText(raw.orderStatus);
    if (ALLOWED_STATUSES.indexOf(status) === -1) {
      /* Older snapshots may carry a legacy submitted state; it is simply
         pending in the order record now. */
      status = "pending";
    }

    /* Delivery is arranged and paid separately from the website product
       amount. Preserve a recorded fee when one exists; otherwise leave it
       null so the detail page can say it is settled with the rider. */
    var deliveryFee = asMoney(raw.deliveryFee, NaN);

    return {
      id: id,
      status: status,
      placedAt: asText(raw.placedAt),
      customer: customer,
      delivery: delivery,
      items: items,
      subtotal: subtotal,
      total: total,
      deliveryFee: isFinite(deliveryFee) ? deliveryFee : null,
      orderingMethod:
        asText(raw.orderingMethod) === "website" ? "website" : "whatsapp",
      payment: payment
    };
  }

  /* One snapshot line. Prices are the recorded order-time figures — the
     catalog is never consulted, so a later price change cannot rewrite
     history. */
  function normalizeLine(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    var name = asText(raw.name);
    if (!name) {
      return null;
    }
    var quantity = asQty(raw.quantity != null ? raw.quantity : raw.qty);
    var unitPrice = asMoney(raw.unitPrice != null ? raw.unitPrice : raw.price, NaN);
    if (!isFinite(unitPrice)) {
      return null;
    }
    var lineTotal = asMoney(raw.lineTotal, NaN);
    if (!isFinite(lineTotal)) {
      lineTotal = unitPrice * quantity;
    }
    return {
      productId: asText(raw.productId != null ? raw.productId : raw.id),
      variantId: asText(raw.variantId != null ? raw.variantId : (raw.unit || raw.variant)),
      name: name,
      variantLabel: asText(raw.variantLabel != null ? raw.variantLabel : (raw.variant || raw.unit)),
      quantity: quantity,
      unitPrice: unitPrice,
      lineTotal: lineTotal
    };
  }

  /* ---------- Status language ----------
     Order status and payment status are ALWAYS derived independently.
     "Paid" is conferred only by a backend-verified snapshot flag — a
     "paid" order status without verification renders as "Unverified",
     never as paid. */
  function orderStatusMeta(status) {
    if (status === "paid") {
      return { key: "paid", label: "Paid", tone: "is-ok" };
    }
    if (status === "pending") {
      return { key: "pending", label: "Pending", tone: "is-warn" };
    }
    if (status === "failed") {
      return { key: "failed", label: "Failed", tone: "is-bad" };
    }
    return { key: "pending", label: "Pending", tone: "is-warn" };
  }

  function paymentMeta(order) {
    var p = (order && order.payment) || { status: "unpaid", verified: false, reference: "" };
    if (p.verified === true && p.reference && (p.status === "paid" || (order && order.status === "paid"))) {
      return { key: "paid", label: "Paid", tone: "is-ok" };
    }
    if (p.status === "paid" || (order && order.status === "paid")) {
      /* Claimed paid but no backend verification — honest, never "Paid". */
      return { key: "unverified", label: "Unverified", tone: "is-warn" };
    }
    if (p.status === "pending") {
      return { key: "pending", label: "Pending", tone: "is-warn" };
    }
    if (p.status === "failed") {
      return { key: "failed", label: "Failed", tone: "is-bad" };
    }
    return { key: "unpaid", label: "Unpaid", tone: "is-muted" };
  }

  /* The payment arrangement recorded at checkout, kept separate from
     payment status. The delivery fee is never part of these amounts. */
  function paymentMethodMeta(order) {
    var p = (order && order.payment) || {};
    var method = asText(p.method);
    if (method === "pay-on-delivery") {
      return {
        key: "pay-on-delivery",
        label: "Pay on Delivery",
        amountLabel: "Amount payable to the rider",
        detail:
          "The product amount is paid physically to the rider on delivery. The delivery fee is also paid separately to the rider."
      };
    }
    if (method === "pay-now") {
      return {
        key: "pay-now",
        label: "Pay Now",
        amountLabel: "Amount payable online",
        detail:
          "The product amount is paid online. The delivery fee is paid separately to the rider."
      };
    }
    if (order && order.orderingMethod === "whatsapp") {
      return {
        key: "whatsapp",
        label: asText(p.label) || "Order via WhatsApp",
        amountLabel: "Amount payable for products",
        detail:
          "This order was arranged through WhatsApp. The delivery fee is paid separately to the rider."
      };
    }
    return {
      key: "not-recorded",
      label: "Not recorded",
      amountLabel: "Amount payable for products",
      detail:
        "No payment method was recorded with this order. The delivery fee is paid separately to the rider."
    };
  }

  function deliveryLabel(mode) {
    if (mode === "address") {
      return "Delivery address";
    }
    return "Delivery details";
  }

  function itemCount(order) {
    var n = 0;
    var items = (order && order.items) || [];
    for (var i = 0; i < items.length; i++) {
      n += items[i].quantity || 0;
    }
    return n;
  }

  /* An order needs attention while it is still actionable: waiting for
     payment verification. Paid and failed are terminal and never count as
     action. */
  function needsAttention(order) {
    return !!order && order.status === "pending";
  }

  /* ---------- Public boundary ---------- */

  /* All orders, newest first. Imports the checkout session snapshot on
     first sight (without overwriting an admin-updated status). Throws
     { code: "ORDERS_LOAD_FAILED" } when storage itself is unreadable so
     the UI can show an honest error state instead of stale data. */
  function getOrders() {
    var map;
    try {
      map = readStoreMap();
    } catch (e) {
      var err = new Error("Order data could not be loaded.");
      err.code = "ORDERS_LOAD_FAILED";
      throw err;
    }
    var sessionOrder = readSessionOrder();
    if (sessionOrder && !map[sessionOrder.id]) {
      map[sessionOrder.id] = sessionOrder;
      /* Import is best-effort: if this browser cannot keep data, the
         session snapshot still renders for this visit. */
      try {
        writeStoreMap(map);
      } catch (e) {
        /* storage unavailable — the in-memory copy still renders */
      }
    }
    var list = [];
    var ids = Object.keys(map);
    for (var i = 0; i < ids.length; i++) {
      list.push(map[ids[i]]);
    }
    list.sort(function (a, b) {
      var ta = new Date(a.placedAt).getTime();
      var tb = new Date(b.placedAt).getTime();
      var na = isNaN(ta);
      var nb = isNaN(tb);
      if (na && nb) {
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      }
      if (na) {
        return 1;
      }
      if (nb) {
        return -1;
      }
      return tb - ta;
    });
    return list;
  }

  function getOrder(id) {
    if (!id) {
      return null;
    }
    var orders = getOrders();
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].id === id) {
        return orders[i];
      }
    }
    return null;
  }

  /* The backend-ready update payload. Shape { orderId, status } mirrors
     the canonical snapshot's own field names. */
  function buildStatusPayload(id, status) {
    return { orderId: id, status: status };
  }

  /* Validate -> build payload -> persist through the order service.
     Django stage: POST/PATCH the payload and resolve the same result
     shape { ok, order?, payload?, error? }. */
  function updateOrderStatus(id, status) {
    if (ALLOWED_STATUSES.indexOf(status) === -1) {
      return {
        ok: false,
        payload: null,
        order: null,
        error: {
          code: "INVALID_STATUS",
          message: "Choose a valid order status."
        }
      };
    }
    var map = readStoreMap();
    var sessionOrder = readSessionOrder();
    if (sessionOrder && !map[sessionOrder.id]) {
      map[sessionOrder.id] = sessionOrder;
    }
    if (!map[id]) {
      return {
        ok: false,
        payload: buildStatusPayload(id, status),
        order: null,
        error: {
          code: "NOT_FOUND",
          message: "That order could not be found. It may have been removed."
        }
      };
    }
    map[id].status = status;
    var saved = writeStoreMap(map);
    if (!saved) {
      return {
        ok: false,
        payload: buildStatusPayload(id, status),
        order: null,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "The status could not be saved in this browser. Please try again."
        }
      };
    }
    /* Read back so success is only reported for a genuinely stored change. */
    var verify = readStoreMap()[id];
    if (!verify || verify.status !== status) {
      return {
        ok: false,
        payload: buildStatusPayload(id, status),
        order: null,
        error: {
          code: "STORE_UNAVAILABLE",
          message: "The status could not be saved in this browser. Please try again."
        }
      };
    }
    return { ok: true, payload: buildStatusPayload(id, status), order: verify, error: null };
  }

  /* Order-specific follow-up message through the central store number:
     reference + customer + recorded total + current status. No private
     delivery details are embedded in the prefilled text. */
  function getOrderWhatsAppHref(order) {
    var statusLabel = orderStatusMeta(order.status).label;
    var lines = [
      "Hello! Following up on O'Toosin Farms order " + order.id + ".",
      "",
      "Customer: " + (order.customer.name || "—"),
      "Items: " + itemCount(order) + " (" + fmtNaira(order.total) + ")",
      "Status: " + statusLabel,
      "",
      "Please confirm the next step."
    ];
    return (
      "https://wa.me/" +
      storeNumber() +
      "?text=" +
      encodeURIComponent(lines.join("\n"))
    );
  }

  function getCustomerCallHref(order) {
    var phone = order && order.customer ? asText(order.customer.phone) : "";
    if (!phone) {
      return "";
    }
    var dial = phone.replace(/[^\d+]/g, "");
    if (!dial) {
      return "";
    }
    return "tel:" + dial;
  }

  if (typeof window !== "undefined") {
    window.FreshDirectAdminOrders = {
      source: "local-snapshot",
      sourceNote:
        "Checkout snapshots kept in this browser. Replace internals with Django order endpoints.",
      storeKey: STORE_KEY,
      allowedStatuses: ALLOWED_STATUSES.slice(),
      getOrders: getOrders,
      getOrder: getOrder,
      buildStatusPayload: buildStatusPayload,
      updateOrderStatus: updateOrderStatus,
      normalize: normalize,
      orderStatusMeta: orderStatusMeta,
      paymentMeta: paymentMeta,
      paymentMethodMeta: paymentMethodMeta,
      deliveryLabel: deliveryLabel,
      itemCount: itemCount,
      needsAttention: needsAttention,
      getOrderWhatsAppHref: getOrderWhatsAppHref,
      getCustomerCallHref: getCustomerCallHref,
      formatNaira: fmtNaira,
      formatDate: fmtDate,
      formatDateFull: fmtDateFull,
      escape: esc
    };
  }
})();
