/* ==========================================================================
   O'Toosin Farms — Checkout page (checkout.html only)
   Uses the existing freshdirect_cart_v1 store through the small
   window.FreshDirectCart bridge. No second cart, no fake payment/order
   success: the supported frontend progression ends at a validated review.

   Receive options, delivery zones and pickup locations live in one
   CHECKOUT_OPTIONS structure so a Django backend can later supply the same
   shape from the admin without redesigning the checkout.
   ========================================================================== */
(function () {
  "use strict";

  var cart = window.FreshDirectCart;
  if (!cart) {
    return;
  }

  // Frontend demonstration data. Replace from the backend later.
  var CHECKOUT_OPTIONS = {
    zones: [
      {
        value: "camp",
        name: "Camp",
        areas: "Fatola, Apakila, Surulere",
        fee: 5000,
      },
      {
        value: "obantoko",
        name: "Obantoko",
        areas: "Eleweran, Somorin, Odoeran",
        fee: 10000,
      },
    ],
    parkDestinations: [
      { value: "lagos", name: "Lagos", fee: null },
      { value: "ibadan", name: "Ibadan", fee: null },
      { value: "ijebu", name: "Ijebu", fee: null },
    ],
    pickupLocations: [
      {
        id: "mummy-d-stores",
        name: "Mummy-D Stores",
        address: "Beside FUNAAB MANCOT Park, Camp, Abeokuta",
      },
    ],
  };

  var LAST_ORDER_KEY = "freshdirect_last_order";
  var lastSubtotal = 0;
  var lastOrder = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(el, value) {
    if (el) {
      el.textContent = value;
    }
  }

  function valueOf(id) {
    var el = byId(id);
    return el ? String(el.value || "").trim() : "";
  }

  function receiveValue() {
    var checked = document.querySelector(
      'input[name="receive-method"]:checked'
    );
    return checked ? checked.value : "doorstep";
  }

  function receiveName(value) {
    if (value === "pickup") {
      return "Pickup";
    }
    if (value === "park") {
      return "Park delivery";
    }
    return "Doorstep delivery";
  }

  function findZone(value) {
    for (var i = 0; i < CHECKOUT_OPTIONS.zones.length; i++) {
      if (CHECKOUT_OPTIONS.zones[i].value === value) {
        return CHECKOUT_OPTIONS.zones[i];
      }
    }
    return null;
  }

  function findParkDestination(value) {
    for (var i = 0; i < CHECKOUT_OPTIONS.parkDestinations.length; i++) {
      if (CHECKOUT_OPTIONS.parkDestinations[i].value === value) {
        return CHECKOUT_OPTIONS.parkDestinations[i];
      }
    }
    return null;
  }

  function findPickupLocation(id) {
    for (var i = 0; i < CHECKOUT_OPTIONS.pickupLocations.length; i++) {
      if (CHECKOUT_OPTIONS.pickupLocations[i].id === id) {
        return CHECKOUT_OPTIONS.pickupLocations[i];
      }
    }
    return null;
  }

  function selectedPickupId() {
    var checked = document.querySelector(
      'input[name="pickup-location"]:checked'
    );
    if (checked) {
      return checked.value;
    }
    var options = CHECKOUT_OPTIONS.pickupLocations;
    return options.length ? options[0].id : "";
  }

  function selectedPickupLocation() {
    return findPickupLocation(selectedPickupId());
  }

  function zoneFee() {
    var zone = findZone(valueOf("oto-co-zone"));
    return zone ? zone.fee : null;
  }

  function deliveryFee() {
    var method = receiveValue();
    if (method === "pickup") {
      return 0;
    }
    if (method === "doorstep") {
      return zoneFee();
    }
    return null;
  }

  function orderTotal() {
    var fee = deliveryFee();
    return lastSubtotal + (fee === null ? 0 : fee);
  }

  function phoneOk(value) {
    var digits = String(value).replace(/[\s\-()]/g, "");
    return /^(\+?234|0)[789][01]\d{8}$/.test(digits);
  }

  function setError(input, message) {
    if (!input) {
      return;
    }
    var error = byId(input.id + "-error");
    if (!message) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      if (error) {
        error.textContent = "";
        error.setAttribute("hidden", "");
      }
      return;
    }
    input.setAttribute("aria-invalid", "true");
    if (error) {
      error.textContent = message;
      error.removeAttribute("hidden");
      input.setAttribute("aria-describedby", error.id);
    }
  }

  function setGroupError(errorId, message) {
    var error = byId(errorId);
    if (!error) {
      return;
    }
    if (!message) {
      error.textContent = "";
      error.setAttribute("hidden", "");
      return;
    }
    error.textContent = message;
    error.removeAttribute("hidden");
  }

  function status(message, isError) {
    var box = byId("fd-checkout-status");
    if (!box) {
      return;
    }
    if (!message) {
      box.textContent = "";
      box.setAttribute("hidden", "");
      box.classList.remove("is-error");
      return;
    }
    box.textContent = message;
    box.removeAttribute("hidden");
    box.classList.toggle("is-error", !!isError);
  }

  function paymentSentence() {
    var method = receiveValue();
    var subtotal = cart.fmtNaira(lastSubtotal);
    if (method === "pickup") {
      var location = selectedPickupLocation();
      return (
        "Your order total is " + subtotal + " for your products, with no delivery fee. " +
        "No payment is collected on this page; payment is arranged directly with O’TOOSIN Farms. " +
        "Collect from " +
        (location ? location.name + ", " + location.address : "your selected pickup location") +
        "."
      );
    }
    if (method === "park") {
      var destination = findParkDestination(valueOf("oto-co-park-destination"));
      return (
        "Your products total is " + subtotal + ". The park delivery charge" +
        (destination ? " for " + destination.name : "") +
        " is confirmed before dispatch. No payment is collected on this page."
      );
    }
    var zone = findZone(valueOf("oto-co-zone"));
    if (!zone) {
      return (
        "Select a delivery zone to see the delivery fee and the full order total."
      );
    }
    return (
      "Your order total is " + cart.fmtNaira(orderTotal()) + ": " + subtotal +
      " for your products plus " + cart.fmtNaira(zone.fee) +
      " delivery to the " + zone.name + " zone. No payment is collected on this page."
    );
  }

  function totalLabel() {
    var method = receiveValue();
    if (method === "pickup") {
      return "Order total";
    }
    if (method === "park") {
      return findParkDestination(valueOf("oto-co-park-destination"))
        ? "Products subtotal (park fee to be confirmed)"
        : "Products only — select a destination";
    }
    return findZone(valueOf("oto-co-zone"))
      ? "Order total"
      : "Products only — select a zone";
  }

  function deliverySummary() {
    var method = receiveValue();
    if (method === "pickup") {
      return { label: "Delivery fee", value: "No delivery fee" };
    }
    if (method === "park") {
      return { label: "Park delivery fee", value: "To be confirmed" };
    }
    var zone = findZone(valueOf("oto-co-zone"));
    return {
      label: zone ? "Delivery fee (" + zone.name + ")" : "Delivery fee",
      value: zone ? cart.fmtNaira(zone.fee) : "Select a zone",
    };
  }

  function updateTotals() {
    var subtotal = cart.fmtNaira(lastSubtotal);
    var subs = document.querySelectorAll("[data-checkout-subtotal]");
    for (var s = 0; s < subs.length; s++) {
      subs[s].textContent = subtotal;
    }
    var totals = document.querySelectorAll("[data-checkout-total]");
    var amount = cart.fmtNaira(orderTotal());
    for (var t = 0; t < totals.length; t++) {
      totals[t].textContent = amount;
    }
    setText(byId("oto-receive-name"), receiveName(receiveValue()));
    var delivery = deliverySummary();
    setText(byId("oto-delivery-label"), delivery.label);
    setText(byId("oto-delivery-value"), delivery.value);
    setText(byId("oto-checkout-total-label"), totalLabel());
    setText(byId("oto-review-total-label"), totalLabel());
    var sentence = paymentSentence();
    setText(byId("oto-pay-note"), sentence);
    setText(byId("oto-pay-summary"), sentence);
    if (lastOrder) {
      lastOrder.receive = buildReceive();
      lastOrder.deliveryFee = deliveryFee();
      lastOrder.total = orderTotal();
      lastOrder.payment = buildPayment();
      renderReviewPayment(lastOrder.payment);
    }
  }

  function summaryItem(item) {
    var li = document.createElement("li");
    li.className = "oto-checkout-item";

    var media = cart.media(item);
    var thumb;
    if (media.src) {
      thumb = document.createElement("a");
      thumb.className = "oto-checkout-thumb";
      thumb.setAttribute(
        "href",
        "product-details.html?id=" + encodeURIComponent(item.id)
      );
      thumb.setAttribute("aria-label", "View " + item.name);
      var img = document.createElement("img");
      img.setAttribute("src", media.src);
      img.setAttribute("alt", media.alt || item.name);
      img.setAttribute("width", "56");
      img.setAttribute("height", "56");
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
      thumb.appendChild(img);
    } else {
      thumb = document.createElement("span");
      thumb.className = "oto-checkout-thumb is-empty";
      thumb.setAttribute("aria-hidden", "true");
      thumb.textContent = String(item.name || "?").charAt(0).toUpperCase();
    }

    var copy = document.createElement("div");
    copy.className = "oto-checkout-item-copy";
    var name = document.createElement("strong");
    var nameLink = document.createElement("a");
    nameLink.setAttribute(
      "href",
      "product-details.html?id=" + encodeURIComponent(item.id)
    );
    nameLink.textContent = item.name;
    name.appendChild(nameLink);
    var meta = document.createElement("span");
    var isKg = cart.isKg(item);
    meta.textContent =
      cart.fmtNaira(item.price) + (isKg ? "/kg" : " each") +
      " \u00b7 " + cart.qtyLabel(item.qty, isKg);
    copy.appendChild(name);
    copy.appendChild(meta);

    var line = document.createElement("strong");
    line.className = "oto-checkout-item-total";
    line.textContent = cart.fmtNaira(cart.lineTotal(item.price, item.qty));

    li.appendChild(thumb);
    li.appendChild(copy);
    li.appendChild(line);
    return li;
  }

  function renderSummary() {
    var main = byId("oto-checkout-main");
    var empty = byId("oto-checkout-empty");
    var list = byId("oto-checkout-lines");
    if (!main || !empty || !list) {
      return false;
    }
    var items = cart.load();
    var valid = [];
    for (var i = 0; i < items.length; i++) {
      if (cart.valid(items[i])) {
        valid.push(items[i]);
      }
    }
    if (!valid.length) {
      main.setAttribute("hidden", "");
      empty.removeAttribute("hidden");
      lastSubtotal = 0;
      return false;
    }
    empty.setAttribute("hidden", "");
    main.removeAttribute("hidden");
    list.innerHTML = "";
    for (var j = 0; j < valid.length; j++) {
      list.appendChild(summaryItem(valid[j]));
    }
    lastSubtotal = cart.subtotal(valid);
    updateTotals();
    return true;
  }

  function currentItems() {
    var items = cart.load();
    var valid = [];
    for (var i = 0; i < items.length; i++) {
      if (cart.valid(items[i])) {
        valid.push(items[i]);
      }
    }
    return valid;
  }

  function buildReceive() {
    var method = receiveValue();
    var receive = { method: method, label: receiveName(method) };
    if (method === "doorstep") {
      var zone = findZone(valueOf("oto-co-zone"));
      receive.zone = zone
        ? { name: zone.name, areas: zone.areas, fee: zone.fee }
        : null;
    } else if (method === "park") {
      var destination = findParkDestination(valueOf("oto-co-park-destination"));
      receive.parkDestination = destination
        ? { name: destination.name }
        : null;
    } else {
      var location = selectedPickupLocation();
      receive.pickupLocation = location
        ? { name: location.name, address: location.address }
        : null;
    }
    return receive;
  }

  function buildPayment() {
    var method = receiveValue();
    var fee = deliveryFee();
    return {
      method: method,
      dueOnline: orderTotal(),
      deliveryFee: fee,
      confirmed: false,
      label: "Payment arranged with O’TOOSIN Farms",
    };
  }

  function buildOrder() {
    var items = currentItems();
    if (!items.length) {
      return null;
    }
    var lines = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var product = cart.product ? cart.product(item.id) : null;
      var media = cart.media(item);
      lines.push({
        productId: item.id,
        variantId: item.unit || item.variant || "",
        name: item.name,
        variantLabel: item.variant || item.unit || "",
        unit: item.unit || item.variant || "",
        category:
          item.category || (product && product.category) || "",
        condition:
          item.condition || (product && product.condition) || "",
        image: media.src || "",
        alt: media.alt || item.name,
        quantity: item.qty,
        quantityLabel: cart.qtyLabel(item.qty, cart.isKg(item)),
        unitPrice: item.price,
        lineTotal: cart.lineTotal(item.price, item.qty),
      });
    }
    var method = receiveValue();
    var doorstep = method === "doorstep";
    return {
      customer: {
        name: valueOf("oto-co-name"),
        phone: valueOf("oto-co-phone"),
        email: valueOf("oto-co-email"),
      },
      delivery: {
        address: doorstep ? valueOf("oto-co-address") : "",
        city: doorstep ? valueOf("oto-co-city") : "",
        state: doorstep ? valueOf("oto-co-state") : "",
        landmark: doorstep ? valueOf("oto-co-landmark") : "",
        instructions: valueOf("oto-co-notes"),
      },
      receive: buildReceive(),
      items: lines,
      subtotal: cart.subtotal(items),
      deliveryFee: deliveryFee(),
      total: orderTotal(),
      payment: buildPayment(),
      orderingMethod: "website",
    };
  }

  function checkField(input) {
    var id = input.id;
    var value = String(input.value || "").trim();
    var method = receiveValue();
    var message = "";
    if (id === "oto-co-name") {
      message = value.length >= 2 ? "" : "Please enter your full name.";
    } else if (id === "oto-co-phone") {
      message = phoneOk(value)
        ? ""
        : "Please enter a valid Nigerian phone number.";
    } else if (id === "oto-co-email") {
      message =
        !value || /^\S+@\S+\.\S+$/.test(value)
          ? ""
          : "Please enter a valid email address.";
    } else if (id === "oto-co-zone") {
      message =
        method !== "doorstep" || value
          ? ""
          : "Please select your delivery zone.";
    } else if (id === "oto-co-address") {
      message =
        method !== "doorstep" || value.length >= 5
          ? ""
          : "Please enter your full delivery address.";
    } else if (id === "oto-co-city") {
      message =
        method !== "doorstep" || value.length >= 2
          ? ""
          : "Please enter your city or town.";
    } else if (id === "oto-co-state") {
      message =
        method !== "doorstep" || value
          ? ""
          : "Please select your state.";
    } else if (id === "oto-co-park-destination") {
      message =
        method !== "park" || value
          ? ""
          : "Please select your park destination.";
    }
    setError(input, message);
    return !message;
  }

  function validateForm() {
    var form = byId("fd-checkout-form");
    var inputs = form
      ? form.querySelectorAll(
          "#oto-co-name, #oto-co-phone, #oto-co-email, #oto-co-zone, " +
          "#oto-co-address, #oto-co-city, #oto-co-state, " +
          "#oto-co-park-destination"
        )
      : [];
    var firstBad = null;
    for (var i = 0; i < inputs.length; i++) {
      if (!checkField(inputs[i]) && !firstBad) {
        firstBad = inputs[i];
      }
    }
    if (receiveValue() === "pickup" && !selectedPickupId()) {
      setGroupError("oto-co-pickup-error", "Please select a pickup location.");
      if (!firstBad) {
        firstBad = byId("oto-pickup-options");
      }
    } else {
      setGroupError("oto-co-pickup-error", "");
    }
    if (firstBad) {
      status("Please check the highlighted fields and try again.", true);
      try {
        firstBad.focus();
        firstBad.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (e) {
        /* focus is best-effort */
      }
      return null;
    }
    status("");
    return buildOrder();
  }

  function addReviewRow(container, label, value) {
    if (!value) {
      return;
    }
    var row = document.createElement("div");
    row.className = "oto-review-row";
    var dt = document.createElement("span");
    dt.className = "oto-review-label";
    dt.textContent = label;
    var dd = document.createElement("strong");
    dd.textContent = value;
    row.appendChild(dt);
    row.appendChild(dd);
    container.appendChild(row);
  }

  function renderReviewPayment(payment) {
    var box = byId("oto-review-payment");
    if (!box) {
      return;
    }
    box.innerHTML = "";
    var name = document.createElement("strong");
    name.textContent = payment.label || "Payment arranged directly";
    var text = document.createElement("span");
    if (payment.method === "pickup") {
      text.textContent =
        "No payment is collected on this page. Your order total is " +
        cart.fmtNaira(payment.dueOnline) +
        " for your products, with no delivery fee. Collect from the selected pickup location.";
    } else if (payment.method === "park") {
      text.textContent =
        "No payment is collected on this page. Your products total is " +
        cart.fmtNaira(payment.dueOnline) +
        ". The park delivery charge is confirmed before dispatch.";
    } else {
      text.textContent =
        "No payment is collected on this page. Your order total is " +
        cart.fmtNaira(payment.dueOnline) +
        ", including the applicable doorstep delivery fee.";
    }
    box.appendChild(name);
    box.appendChild(text);
  }

  function renderReviewDetails(order) {
    var details = byId("oto-review-details");
    if (!details) {
      return;
    }
    details.innerHTML = "";
    addReviewRow(details, "Name", order.customer.name);
    addReviewRow(details, "Phone", order.customer.phone);
    addReviewRow(details, "Email", order.customer.email);
    addReviewRow(details, "Receiving method", order.receive.label);
    if (order.receive.method === "doorstep" && order.receive.zone) {
      addReviewRow(
        details,
        "Delivery zone",
        order.receive.zone.name + " — " + order.receive.zone.areas
      );
      addReviewRow(details, "Delivery address", order.delivery.address);
      addReviewRow(details, "City / town", order.delivery.city);
      addReviewRow(details, "State", order.delivery.state);
      addReviewRow(details, "Landmark", order.delivery.landmark);
    } else if (order.receive.method === "park") {
      if (order.receive.parkDestination) {
        addReviewRow(
          details,
          "Park destination",
          order.receive.parkDestination.name
        );
      }
      addReviewRow(details, "Park delivery fee", "To be confirmed");
    } else if (order.receive.pickupLocation) {
      addReviewRow(
        details,
        "Pickup location",
        order.receive.pickupLocation.name
      );
      addReviewRow(
        details,
        "Pickup address",
        order.receive.pickupLocation.address
      );
    }
    addReviewRow(details, "Order notes", order.delivery.instructions);
  }

  function showReview(order) {
    if (!order) {
      return;
    }
    lastOrder = order;
    var items = byId("oto-review-items");
    if (!items) {
      return;
    }
    renderReviewDetails(order);
    items.innerHTML = "";
    for (var i = 0; i < order.items.length; i++) {
      var it = order.items[i];
      var li = document.createElement("li");
      var label = document.createElement("span");
      label.textContent = it.name + " \u00b7 " + it.quantityLabel;
      var amount = document.createElement("strong");
      amount.textContent = cart.fmtNaira(it.lineTotal);
      li.appendChild(label);
      li.appendChild(amount);
      items.appendChild(li);
    }
    updateTotals();
    renderReviewPayment(order.payment);

    var form = byId("fd-checkout-form");
    var review = byId("fd-checkout-review");
    if (form) {
      form.setAttribute("hidden", "");
    }
    if (review) {
      review.removeAttribute("hidden");
      var title = byId("oto-review-title");
      try {
        if (title) {
          title.focus({ preventScroll: true });
        }
        review.scrollIntoView({ block: "start", behavior: "smooth" });
      } catch (e) {
        /* focus/scroll is best-effort */
      }
    }
  }

  function editDetails() {
    var form = byId("fd-checkout-form");
    var review = byId("fd-checkout-review");
    if (form) {
      form.removeAttribute("hidden");
    }
    if (review) {
      review.setAttribute("hidden", "");
    }
    status("");
    var name = byId("oto-co-name");
    if (name) {
      try {
        form.scrollIntoView({ block: "start", behavior: "smooth" });
        name.focus({ preventScroll: true });
      } catch (e) {
        /* best-effort */
      }
    }
  }

  function makeOrderRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    try {
      for (var i = 0; i < 6; i++) {
        out += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } catch (e) {
      out = "000000";
    }
    return "OF-" + out;
  }

  function saveOrderSnapshot(order) {
    var snapshot = {
      id: makeOrderRef(),
      status: "saved",
      placedAt: new Date().toISOString(),
      orderingMethod: "website",
      customer: order.customer,
      delivery: order.delivery,
      receive: order.receive,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      payment: {
        method: order.payment.method,
        label: order.payment.label,
        dueOnline: order.payment.dueOnline,
        deliveryFee: order.payment.deliveryFee,
        confirmed: order.payment.confirmed,
        status: "unpaid",
        verified: false,
        provider: "",
        reference: "",
      },
    };
    try {
      window.sessionStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify(snapshot)
      );
      return snapshot;
    } catch (e) {
      return null;
    }
  }

  function finishCheckout() {
    if (!lastOrder) {
      status("Please review your order details before finishing.", true);
      return;
    }
    var snapshot = saveOrderSnapshot(lastOrder);
    if (!snapshot) {
      status(
        "We could not save your order summary in this browser. Please try again.",
        true
      );
      return;
    }
    window.location.href =
      "order-confirmation.html?order=" + encodeURIComponent(snapshot.id);
  }

  function renderZoneOptions() {
    var select = byId("oto-co-zone");
    if (!select) {
      return;
    }
    select.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select your delivery zone";
    select.appendChild(placeholder);
    for (var i = 0; i < CHECKOUT_OPTIONS.zones.length; i++) {
      var zone = CHECKOUT_OPTIONS.zones[i];
      var option = document.createElement("option");
      option.value = zone.value;
      option.textContent =
        zone.name + " — " + zone.areas + " (" + cart.fmtNaira(zone.fee) + ")";
      select.appendChild(option);
    }
  }

  function renderParkOptions() {
    var select = byId("oto-co-park-destination");
    if (!select) {
      return;
    }
    select.innerHTML = "";
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a park destination";
    select.appendChild(placeholder);
    for (var i = 0; i < CHECKOUT_OPTIONS.parkDestinations.length; i++) {
      var destination = CHECKOUT_OPTIONS.parkDestinations[i];
      var option = document.createElement("option");
      option.value = destination.value;
      option.textContent = destination.name;
      select.appendChild(option);
    }
  }

  function renderPickupOptions() {
    var wrap = byId("oto-pickup-options");
    if (!wrap) {
      return;
    }
    wrap.innerHTML = "";
    for (var i = 0; i < CHECKOUT_OPTIONS.pickupLocations.length; i++) {
      var location = CHECKOUT_OPTIONS.pickupLocations[i];
      var label = document.createElement("label");
      label.className = "fd-check-radio oto-pickup-location";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "pickup-location";
      input.value = location.id;
      if (i === 0) {
        input.checked = true;
      }
      var copy = document.createElement("span");
      copy.className = "oto-pickup-copy";
      var name = document.createElement("strong");
      name.textContent = location.name;
      var address = document.createElement("small");
      address.textContent = location.address;
      copy.appendChild(name);
      copy.appendChild(address);
      var tick = document.createElement("span");
      tick.className = "oto-pickup-tick";
      tick.setAttribute("aria-hidden", "true");
      var tickIcon = document.createElement("i");
      tickIcon.className = "fas fa-check";
      tick.appendChild(tickIcon);
      label.appendChild(input);
      label.appendChild(copy);
      label.appendChild(tick);
      wrap.appendChild(label);
    }
  }

  function updatePanels() {
    var method = receiveValue();
    var doorstep = byId("oto-doorstep-panel");
    var park = byId("oto-park-panel");
    var pickup = byId("oto-pickup-panel");
    if (doorstep) {
      if (method === "doorstep") {
        doorstep.removeAttribute("hidden");
      } else {
        doorstep.setAttribute("hidden", "");
      }
    }
    if (park) {
      if (method === "park") {
        park.removeAttribute("hidden");
      } else {
        park.setAttribute("hidden", "");
      }
    }
    if (pickup) {
      if (method === "pickup") {
        pickup.removeAttribute("hidden");
      } else {
        pickup.setAttribute("hidden", "");
      }
    }
    clearPanelErrors(method);
  }

  function clearPanelErrors(method) {
    var ids = [];
    if (method !== "doorstep") {
      ids.push("oto-co-zone", "oto-co-address", "oto-co-city", "oto-co-state");
    }
    if (method !== "park") {
      ids.push("oto-co-park-destination");
    }
    for (var i = 0; i < ids.length; i++) {
      setError(byId(ids[i]), "");
    }
    if (method !== "pickup") {
      setGroupError("oto-co-pickup-error", "");
    }
  }

  function wireForm() {
    var form = byId("fd-checkout-form");
    if (!form) {
      return;
    }
    var fields = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < fields.length; i++) {
      (function (input) {
        if (input.type === "radio" && input.name === "receive-method") {
          return;
        }
        if (input.type === "radio" && input.name === "pickup-location") {
          input.addEventListener("change", function () {
            setGroupError("oto-co-pickup-error", "");
            status("");
            updateTotals();
          });
          return;
        }
        input.addEventListener("blur", function () {
          if (form.getAttribute("data-tried") === "true") {
            checkField(input);
          }
        });
        input.addEventListener("input", function () {
          setError(input, "");
          status("");
        });
        input.addEventListener("change", function () {
          setError(input, "");
          status("");
          if (input.id === "oto-co-zone" || input.id === "oto-co-park-destination") {
            updateTotals();
          }
        });
      })(fields[i]);
    }

    var methods = form.querySelectorAll('input[name="receive-method"]');
    for (var m = 0; m < methods.length; m++) {
      methods[m].addEventListener("change", function () {
        status("");
        updatePanels();
        updateTotals();
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      form.setAttribute("data-tried", "true");
      if (!renderSummary()) {
        status("Your cart is empty. Add some products before checking out.", true);
        return;
      }
      var order = validateForm();
      if (!order) {
        return;
      }
      showReview(order);
    });

    var edit = byId("fd-review-edit");
    if (edit) {
      edit.addEventListener("click", editDetails);
    }

    var confirmOrder = byId("fd-review-confirm");
    if (confirmOrder) {
      confirmOrder.addEventListener("click", function () {
        if (confirmOrder.disabled) {
          return;
        }
        confirmOrder.disabled = true;
        finishCheckout();
        confirmOrder.disabled = false;
      });
    }
  }

  function init() {
    var wrap = byId("oto-checkout-wrap");
    if (!wrap) {
      return;
    }
    cart.seedDemo();
    renderZoneOptions();
    renderParkOptions();
    renderPickupOptions();
    updatePanels();
    renderSummary();
    wireForm();
    updateTotals();

    window.addEventListener("pageshow", function () {
      renderSummary();
    });
    document.addEventListener("freshdirect:cart", function () {
      var review = byId("fd-checkout-review");
      var form = byId("fd-checkout-form");
      if (review && !review.hasAttribute("hidden")) {
        review.setAttribute("hidden", "");
        if (form) {
          form.removeAttribute("hidden");
        }
        status("");
      }
      renderSummary();
    });
    window.addEventListener("storage", function (ev) {
      if (!ev || ev.key !== "freshdirect_cart_v1") {
        return;
      }
      var review = byId("fd-checkout-review");
      var form = byId("fd-checkout-form");
      if (review && !review.hasAttribute("hidden")) {
        review.setAttribute("hidden", "");
        if (form) {
          form.removeAttribute("hidden");
        }
        status("");
      }
      renderSummary();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
