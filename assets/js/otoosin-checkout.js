/* ==========================================================================
   O'Toosin Farms — Checkout page (checkout.html only)
   Uses the existing freshdirect_cart_v1 store through the small
   window.FreshDirectCart bridge. No second cart, no fake payment/order
   success: the supported frontend progression ends at a validated review.
   ========================================================================== */
(function () {
  "use strict";

  var cart = window.FreshDirectCart;
  if (!cart) {
    return;
  }

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

  function paymentValue() {
    var checked = document.querySelector(
      'input[name="payment-method"]:checked'
    );
    return checked ? checked.value : "pay-now";
  }

  function paymentName(value) {
    return value === "pay-on-delivery" ? "Pay on Delivery" : "Pay Now";
  }

  function paymentSentence(value) {
    if (value === "pay-on-delivery") {
      return (
        "Pay the product amount to the rider when your order arrives. " +
        "The delivery fee is also settled separately with the rider."
      );
    }
    return (
      "Pay the product amount online in the secure payment step. " +
      "The delivery fee is paid separately to the rider."
    );
  }

  function paymentTotalLabel(value) {
    return value === "pay-on-delivery"
      ? "Amount payable on delivery"
      : "Amount payable online";
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

  function updatePaymentCopy() {
    var method = paymentValue();
    var amount = cart.fmtNaira(lastSubtotal);
    var sentence = paymentSentence(method);
    setText(byId("oto-pay-note"), sentence);
    setText(byId("oto-pay-summary"), sentence);
    setText(byId("oto-pay-name"), paymentName(method));
    setText(byId("oto-checkout-total-label"), paymentTotalLabel(method));
    setText(
      byId("oto-pay-amount"),
      method === "pay-on-delivery"
        ? amount + " to the rider on delivery"
        : amount + " online"
    );
    if (lastOrder) {
      lastOrder.payment = { method: method, label: paymentName(method) };
      renderReviewPayment(method);
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
    var amount = cart.fmtNaira(lastSubtotal);
    var subtotals = document.querySelectorAll("[data-checkout-subtotal]");
    for (var s = 0; s < subtotals.length; s++) {
      subtotals[s].textContent = amount;
    }
    var totals = document.querySelectorAll("[data-checkout-total]");
    for (var t = 0; t < totals.length; t++) {
      totals[t].textContent = amount;
    }
    updatePaymentCopy();
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

  function buildOrder() {
    var items = currentItems();
    if (!items.length) {
      return null;
    }
    var lines = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      lines.push({
        productId: item.id,
        variantId: item.unit || item.variant || "",
        name: item.name,
        variantLabel: item.variant || item.unit || "",
        quantity: item.qty,
        quantityLabel: cart.qtyLabel(item.qty, cart.isKg(item)),
        unitPrice: item.price,
        lineTotal: cart.lineTotal(item.price, item.qty),
      });
    }
    var method = paymentValue();
    return {
      customer: {
        name: valueOf("oto-co-name"),
        phone: valueOf("oto-co-phone"),
        email: valueOf("oto-co-email"),
      },
      delivery: {
        address: valueOf("oto-co-address"),
        city: valueOf("oto-co-city"),
        state: valueOf("oto-co-state"),
        landmark: valueOf("oto-co-landmark"),
        instructions: valueOf("oto-co-notes"),
      },
      items: lines,
      subtotal: cart.subtotal(items),
      payment: { method: method, label: paymentName(method) },
      orderingMethod: "website",
    };
  }

  function checkField(input) {
    var id = input.id;
    var value = String(input.value || "").trim();
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
    } else if (id === "oto-co-address") {
      message =
        value.length >= 5 ? "" : "Please enter your full delivery address.";
    } else if (id === "oto-co-city") {
      message =
        value.length >= 2 ? "" : "Please enter your city or town.";
    } else if (id === "oto-co-state") {
      message = value ? "" : "Please select your state.";
    }
    setError(input, message);
    return !message;
  }

  function validateForm() {
    var form = byId("fd-checkout-form");
    var inputs = form
      ? form.querySelectorAll(
          "#oto-co-name, #oto-co-phone, #oto-co-email, #oto-co-address, " +
          "#oto-co-city, #oto-co-state"
        )
      : [];
    var firstBad = null;
    for (var i = 0; i < inputs.length; i++) {
      if (!checkField(inputs[i]) && !firstBad) {
        firstBad = inputs[i];
      }
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

  function renderReviewPayment(method) {
    var box = byId("oto-review-payment");
    if (!box) {
      return;
    }
    box.innerHTML = "";
    var name = document.createElement("strong");
    name.textContent = paymentName(method);
    var text = document.createElement("span");
    text.textContent =
      method === "pay-on-delivery"
        ? "Pay " + cart.fmtNaira(lastSubtotal) +
          " for the products to the rider on delivery. The delivery fee is also paid separately to the rider."
        : "Pay " + cart.fmtNaira(lastSubtotal) +
          " for the products online in the secure payment step. The delivery fee is paid separately to the rider.";
    box.appendChild(name);
    box.appendChild(text);
  }

  function showReview(order) {
    if (!order) {
      return;
    }
    lastOrder = order;
    var details = byId("oto-review-details");
    var items = byId("oto-review-items");
    if (!details || !items) {
      return;
    }
    details.innerHTML = "";
    addReviewRow(details, "Name", order.customer.name);
    addReviewRow(details, "Phone", order.customer.phone);
    addReviewRow(details, "Email", order.customer.email);
    addReviewRow(details, "Delivery address", order.delivery.address);
    addReviewRow(details, "City / town", order.delivery.city);
    addReviewRow(details, "State", order.delivery.state);
    addReviewRow(details, "Landmark", order.delivery.landmark);
    addReviewRow(details, "Instructions", order.delivery.instructions);

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
    renderReviewPayment(order.payment.method);

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

  function wireForm() {
    var form = byId("fd-checkout-form");
    if (!form) {
      return;
    }
    var fields = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < fields.length; i++) {
      (function (input) {
        if (input.type === "radio") {
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
        });
      })(fields[i]);
    }

    var methods = form.querySelectorAll('input[name="payment-method"]');
    for (var m = 0; m < methods.length; m++) {
      methods[m].addEventListener("change", function () {
        status("");
        updatePaymentCopy();
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      form.setAttribute("data-tried", "true");
      if (!renderSummary()) {
        status("Your cart is empty. Add some meat before checking out.", true);
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
  }

  function init() {
    var wrap = byId("oto-checkout-wrap");
    if (!wrap) {
      return;
    }
    cart.seedDemo();
    renderSummary();
    wireForm();
    updatePaymentCopy();

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
