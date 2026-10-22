/* ==========================================================================
   O'Toosin Farms Admin — Settings source boundary (Stage 5: Admin Settings)
   --------------------------------------------------------------------------
   Vanilla JS, no dependencies, no framework. Admin-scoped: never touches
   the customer cart store and never loads fresh-direct.js, so customer
   state cannot leak into the admin area.

   CANONICAL SETTINGS SHAPE (the store's operational record for V1):
     { businessName, contactPhone, whatsapp, address, description }
   Every default below is an established O'Toosin Farms truth, taken from
   the storefront — never invented:
     - businessName "O'Toosin Farms" (site identity everywhere).
     - whatsapp "2349011058873" (FRESH_DIRECT.whatsappNumber, the single
       centralized ordering/contact number).
     - address: the outlet line used across the storefront footers.
     - description: the storefront summary of the meat shop.
     - contactPhone starts EMPTY: no store call number is established
       anywhere in the project, so none is invented. It stays "Not set"
       until the owner genuinely adds one.
   Delivery is not a configurable fee in this storefront. Checkout
   collects an address and the rider is arranged afterwards; the delivery
   fee is paid separately to the rider. The Settings page therefore shows
   the operating rules rather than inventing an unsupported fee field,
   delivery-zone editor, rider workflow, tax, inventory or multi-seller
   settings.

   CURRENT SOURCE (frontend-only phase):
     Store edits are validated here and kept in this browser
     (localStorage "freshdirect_admin_settings_v1") through this same
     service. updateSettings() reports the genuine result: success means
     "saved in this browser" — never a database claim — and failures
     (invalid values, unavailable storage) are reported truthfully with
     per-field messages. The admin order follow-up link reads
     getWhatsAppNumber(), so a saved WhatsApp change genuinely takes
     effect in the admin while the storefront keeps its own centralized
     configuration until the backend owns it. Records left over from the
     earlier "Harvest Castle" defaults are migrated on read.

   DJANGO INTEGRATION (later stage, no settings-UI rebuild needed):
     - Replace the bodies of getSettings()/updateSettings() with API
       calls (GET settings, PATCH/PUT settings payload) that resolve the
       SAME canonical shape and the SAME result shape
       { ok, settings?, errors? }.
     - Validation errors from the backend merge into `errors` by field
       name; every renderer below is reused untouched.
     - Keep this file's public signatures so fd-admin-settings.js and
       fd-admin-orders-data.js are reused untouched.
     - Do NOT hardcode endpoint URLs here.
   ========================================================================== */
(function () {
  "use strict";

  var STORE_KEY = "freshdirect_admin_settings_v1";

  /* Central store number (digits only). Mirrors
     FRESH_DIRECT.whatsappNumber (assets/js/fresh-direct.js), which
     mirrors the future Django setting WHATSAPP_NUMBER. Never add a
     second number: overrides live in the settings record above. */
  var CENTRAL_WHATSAPP = "2349011058873";

  /* Delivery is arranged by staff after checkout and the fee is paid
     directly to the rider. These are fixed operating rules, not editable
     values: the checkout does not charge or calculate a delivery fee. */
  var DELIVERY_INFO = {
    arrangement:
      "Orders are checked after checkout and a rider is arranged by O'Toosin Farms staff.",
    coverage:
      "Checkout collects the delivery address, city or town, state and a landmark.",
    payNow:
      "Pay Now settles the product amount online. The delivery fee is separate.",
    payOnDelivery:
      "Pay on Delivery settles the product amount with the rider. The delivery fee is also paid to the rider.",
    fee:
      "It is never added to the website product total and is not collected online.",
    outlet: "No. 89, behind Foursquare Church, FUNAAB Alabata Road, Camp, Abeokuta.",
    hours: "Mon - Sat: 09.00 to 06.00"
  };

  var DEFAULTS = {
    businessName: "O'Toosin Farms",
    contactPhone: "",
    whatsapp: CENTRAL_WHATSAPP,
    address: "No. 89, behind Foursquare Church, FUNAAB Alabata Road, Camp, Abeokuta.",
    description:
      "A meat shop selling pork, chicken, turkey, beef, goat meat and fish. Browse by meat type and state, order by the kilogram, and choose Pay Now or Pay on Delivery."
  };

  /* Values written by earlier builds. They are dropped on read so the
     current O'Toosin defaults apply instead of stale branding. */
  var LEGACY_BUSINESS_NAME = "Harvest Castle";
  var LEGACY_DESCRIPTION =
    "Farm produce sold directly to you. Shop online on the website, or order through WhatsApp \u2014 serving the FUNAAB and Abeokuta community.";

  var FIELDS = ["businessName", "contactPhone", "whatsapp", "address", "description"];

  function asText(value) {
    return typeof value === "string" ? value : "";
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

  function readStored() {
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
      var saved = (data && data.settings) || {};
      var out = {};
      for (var i = 0; i < FIELDS.length; i++) {
        if (typeof saved[FIELDS[i]] === "string") {
          out[FIELDS[i]] = saved[FIELDS[i]];
        }
      }
      /* Migrate stale branding without inventing a new store record. */
      var migrated = false;
      if (out.businessName === LEGACY_BUSINESS_NAME) {
        delete out.businessName;
        migrated = true;
      }
      if (out.description === LEGACY_DESCRIPTION) {
        delete out.description;
        migrated = true;
      }
      if (migrated) {
        writeStored(out);
      }
      return out;
    } catch (e) {
      return {};
    }
  }

  function writeStored(settings) {
    var store = localStore();
    if (!store) {
      return false;
    }
    try {
      store.setItem(STORE_KEY, JSON.stringify({ v: 1, settings: settings }));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- Normalization ---------- */
  /* WhatsApp / phone input tolerance: spaces, dashes and brackets are
     ignored; a leading 0 becomes the 234 country code; a leading +
     is dropped. Stored canonically as digits for wa.me links. */
  function normalizePhone(value) {
    var digits = asText(value).replace(/[^\d+]/g, "");
    if (digits.charAt(0) === "+") {
      digits = digits.slice(1);
    }
    digits = digits.replace(/\D/g, "");
    if (/^0\d+/.test(digits)) {
      digits = "234" + digits.slice(1);
    }
    return digits;
  }

  function isNigerianMobile(digits) {
    return /^234[789][01]\d{8}$/.test(digits);
  }

  /* ---------- Validation (client-side only; Django re-validates) ---------- */
  function validate(settings) {
    var errors = {};
    var name = asText(settings.businessName).trim();
    if (!name) {
      errors.businessName = "Enter your business name.";
    } else if (name.length < 2) {
      errors.businessName = "Business name must be at least 2 characters.";
    } else if (name.length > 80) {
      errors.businessName = "Business name must be 80 characters or fewer.";
    }
    var phone = asText(settings.contactPhone).trim();
    if (phone && !isNigerianMobile(normalizePhone(phone))) {
      errors.contactPhone = "Enter a valid Nigerian phone number, or leave it empty.";
    }
    var wa = asText(settings.whatsapp).trim();
    if (!wa) {
      errors.whatsapp = "Enter the WhatsApp number customers should reach.";
    } else if (!isNigerianMobile(normalizePhone(wa))) {
      errors.whatsapp = "Enter a valid Nigerian WhatsApp number.";
    }
    var address = asText(settings.address).trim();
    if (!address) {
      errors.address = "Enter your business address.";
    } else if (address.length < 5) {
      errors.address = "Business address looks too short.";
    } else if (address.length > 300) {
      errors.address = "Business address must be 300 characters or fewer.";
    }
    var desc = asText(settings.description).trim();
    if (!desc) {
      errors.description = "Enter a short storefront introduction.";
    } else if (desc.length < 20) {
      errors.description = "Storefront introduction looks too short.";
    } else if (desc.length > 500) {
      errors.description = "Storefront introduction must be 500 characters or fewer.";
    }
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function canonicalize(settings) {
    return {
      businessName: asText(settings.businessName).trim(),
      contactPhone: asText(settings.contactPhone).trim(),
      whatsapp: normalizePhone(asText(settings.whatsapp)),
      address: asText(settings.address).trim(),
      description: asText(settings.description).trim()
    };
  }

  /* ---------- Public boundary ---------- */

  /* Current settings: established defaults overlaid with anything the
     owner genuinely saved in this browser. Always returns a fresh
     object in the canonical shape. */
  function getSettings() {
    var out = {};
    for (var i = 0; i < FIELDS.length; i++) {
      out[FIELDS[i]] = DEFAULTS[FIELDS[i]];
    }
    var stored = readStored();
    var keys = Object.keys(stored);
    for (var j = 0; j < keys.length; j++) {
      if (FIELDS.indexOf(keys[j]) !== -1) {
        out[keys[j]] = stored[keys[j]];
      }
    }
    return canonicalizeLight(out);
  }

  /* Defaults are already canonical except stored overrides, which are
     re-validated on read so a hand-edited record can never inject a
     malformed WhatsApp number into admin links. */
  function canonicalizeLight(settings) {
    var out = {};
    for (var i = 0; i < FIELDS.length; i++) {
      out[FIELDS[i]] = asText(settings[FIELDS[i]]);
    }
    if (out.whatsapp && !isNigerianMobile(out.whatsapp)) {
      var fixed = normalizePhone(out.whatsapp);
      out.whatsapp = isNigerianMobile(fixed) ? fixed : CENTRAL_WHATSAPP;
    }
    if (!out.whatsapp) {
      out.whatsapp = CENTRAL_WHATSAPP;
    }
    return out;
  }

  /* Validate -> persist through the settings service.
     Django stage: PATCH the payload and resolve the same result shape
     { ok, settings?, errors? }. */
  function updateSettings(patch) {
    var next = getSettings();
    var incoming = patch && typeof patch === "object" ? patch : {};
    for (var i = 0; i < FIELDS.length; i++) {
      if (typeof incoming[FIELDS[i]] === "string") {
        next[FIELDS[i]] = incoming[FIELDS[i]];
      }
    }
    var checked = validate(next);
    if (!checked.ok) {
      return { ok: false, settings: null, errors: checked.errors };
    }
    var canonical = canonicalize(next);
    if (!writeStored(canonical)) {
      return {
        ok: false,
        settings: null,
        errors: {
          _form: "Your changes could not be saved. Please try again."
        }
      };
    }
    /* Read back so success is only reported for a genuinely stored change. */
    var verify = getSettings();
    for (var j = 0; j < FIELDS.length; j++) {
      if (verify[FIELDS[j]] !== canonical[FIELDS[j]]) {
        return {
          ok: false,
          settings: null,
          errors: {
            _form: "Your changes could not be saved. Please try again."
          }
        };
      }
    }
    return { ok: true, settings: verify, errors: {} };
  }

  /* The single WhatsApp source for admin surfaces (order follow-ups).
     Falls back to the centralized digits when nothing valid is stored. */
  function getWhatsAppNumber() {
    try {
      var current = getSettings();
      if (current.whatsapp && isNigerianMobile(current.whatsapp)) {
        return current.whatsapp;
      }
    } catch (e) {
      /* fall through to the centralized digits */
    }
    return CENTRAL_WHATSAPP;
  }

  function getDeliveryInfo() {
    return {
      arrangement: DELIVERY_INFO.arrangement,
      coverage: DELIVERY_INFO.coverage,
      payNow: DELIVERY_INFO.payNow,
      payOnDelivery: DELIVERY_INFO.payOnDelivery,
      fee: DELIVERY_INFO.fee,
      outlet: DELIVERY_INFO.outlet,
      hours: DELIVERY_INFO.hours
    };
  }

  if (typeof window !== "undefined") {
    window.FreshDirectAdminSettings = {
      source: "local-record",
      sourceNote:
        "Store record kept in this browser. Replace internals with Django settings endpoints.",
      storeKey: STORE_KEY,
      fields: FIELDS.slice(),
      centralWhatsApp: CENTRAL_WHATSAPP,
      getSettings: getSettings,
      updateSettings: updateSettings,
      validate: validate,
      normalizePhone: normalizePhone,
      getWhatsAppNumber: getWhatsAppNumber,
      getDeliveryInfo: getDeliveryInfo
    };
  }
})();
