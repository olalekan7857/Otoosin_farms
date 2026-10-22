/* ==========================================================================
   O'Toosin Farms Admin — Product source boundary
   --------------------------------------------------------------------------
   The admin pages never load fresh-direct.js so the customer cart store
   cannot leak into the seller area. This file mirrors the O'Toosin Farms
   meat catalogue in the canonical product shape used by the storefront.

   getCatalog() returns the built-in demonstration records plus anything
   the seller created or edited in this browser through
   window.FreshDirectAdminStore. A fresh object is returned every time so
   callers cannot mutate the built-in records.

   Demonstration values are marked here in source only. Prices are Naira
   per kilogram and represent illustrative frontend data.
   ========================================================================== */
(function () {
  "use strict";

  var MIRROR = {
    "demo-pork-chops": {
      id: "demo-pork-chops",
      name: "Pork Chops",
      category: "Pork",
      group: "Red meat",
      condition: "Fresh",
      cut: "Bone-in chops",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "Tender pork chops with a rich flavour, great for grilling or pan-searing.",
      images: [{ src: "assets/img/meat/pork-chops.svg", alt: "Fresh pork chops", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 4800 }]
    },
    "demo-pork-belly": {
      id: "demo-pork-belly",
      name: "Pork Belly",
      category: "Pork",
      group: "Red meat",
      condition: "Frozen",
      cut: "Belly cut",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Frozen",
      defaultVariant: "1kg",
      desc: "Layered pork belly that crisps beautifully when roasted or fried.",
      images: [{ src: "assets/img/meat/pork-belly.svg", alt: "Frozen pork belly strips", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 4200 }]
    },
    "demo-whole-chicken": {
      id: "demo-whole-chicken",
      name: "Whole Chicken",
      category: "Chicken",
      group: "Poultry",
      condition: "Fresh",
      cut: "Whole bird",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "A whole chicken for roasting, grilling or cutting into pieces for stews.",
      images: [{ src: "assets/img/meat/whole-chicken.svg", alt: "Whole fresh chicken", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 3500 }]
    },
    "demo-chicken-wings": {
      id: "demo-chicken-wings",
      name: "Chicken Wings",
      category: "Chicken",
      group: "Poultry",
      condition: "Frozen",
      cut: "Wings",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Frozen",
      defaultVariant: "1kg",
      desc: "Meaty chicken wings for grilling, frying or oven baking.",
      images: [{ src: "assets/img/meat/chicken-wings.svg", alt: "Frozen chicken wings", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 4000 }]
    },
    "demo-chicken-drumsticks": {
      id: "demo-chicken-drumsticks",
      name: "Chicken Drumsticks",
      category: "Chicken",
      group: "Poultry",
      condition: "Frozen",
      cut: "Drumsticks",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Frozen",
      defaultVariant: "1kg",
      desc: "Juicy drumsticks for the oven, grill or a family stew.",
      images: [{ src: "assets/img/meat/chicken-drumsticks.svg", alt: "Frozen chicken drumsticks", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 3800 }]
    },
    "demo-turkey-breast": {
      id: "demo-turkey-breast",
      name: "Turkey Breast",
      category: "Turkey",
      group: "Poultry",
      condition: "Fresh",
      cut: "Boneless breast",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "Lean turkey breast, easy to roast whole or slice for sandwiches.",
      images: [{ src: "assets/img/meat/turkey-breast.svg", alt: "Fresh turkey breast with carved slices", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 5200 }]
    },
    "demo-beef-steak": {
      id: "demo-beef-steak",
      name: "Beef Steak",
      category: "Beef",
      group: "Red meat",
      condition: "Fresh",
      cut: "Steak cuts",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "Marbled beef steak with a bold flavour and a tender bite.",
      images: [{ src: "assets/img/meat/beef-steak.svg", alt: "Fresh marbled beef steak", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 7500 }]
    },
    "demo-beef-brisket": {
      id: "demo-beef-brisket",
      name: "Beef Brisket",
      category: "Beef",
      group: "Red meat",
      condition: "Frozen",
      cut: "Brisket joint",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Frozen",
      defaultVariant: "1kg",
      desc: "A slow-cooking beef brisket that becomes tender and rich.",
      images: [{ src: "assets/img/meat/beef-brisket.svg", alt: "Frozen beef brisket joint", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 6800 }]
    },
    "demo-goat-meat": {
      id: "demo-goat-meat",
      name: "Goat Meat",
      category: "Goat Meat",
      group: "Red meat",
      condition: "Fresh",
      cut: "Mixed bone-in pieces",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "Clean goat meat pieces for stews, soups and traditional dishes.",
      images: [{ src: "assets/img/meat/goat-meat.svg", alt: "Fresh cubed goat meat", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 6200 }]
    },
    "demo-fried-goat-meat": {
      id: "demo-fried-goat-meat",
      name: "Fried Goat Meat",
      category: "Goat Meat",
      group: "Red meat",
      condition: "Fried",
      cut: "Fried pieces",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fried",
      defaultVariant: "1kg",
      desc: "Fried goat meat with a deep savoury flavour and a long pantry life.",
      images: [{ src: "assets/img/meat/goat-meat.svg", alt: "Fried goat meat pieces", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 8000 }]
    },
    "demo-fresh-catfish": {
      id: "demo-fresh-catfish",
      name: "Fresh Catfish",
      category: "Fish",
      group: "Seafood",
      condition: "Fresh",
      cut: "Whole, cleaned",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fresh",
      defaultVariant: "1kg",
      desc: "Whole fresh catfish, cleaned and ready for pepper soup or grilling.",
      images: [{ src: "assets/img/meat/catfish.svg", alt: "Fresh whole catfish", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 3200 }]
    },
    "demo-tilapia": {
      id: "demo-tilapia",
      name: "Tilapia",
      category: "Fish",
      group: "Seafood",
      condition: "Frozen",
      cut: "Whole",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Frozen",
      defaultVariant: "1kg",
      desc: "Whole tilapia with firm white flesh, ideal for frying or baking.",
      images: [{ src: "assets/img/meat/tilapia.svg", alt: "Frozen whole tilapia", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 2900 }]
    },
    "demo-fried-catfish": {
      id: "demo-fried-catfish",
      name: "Fried Catfish",
      category: "Fish",
      group: "Seafood",
      condition: "Fried",
      cut: "Fried whole",
      priceBasis: "Per kilogram",
      priceUnit: "per kg",
      status: "in",
      badge: "Fried",
      defaultVariant: "1kg",
      desc: "Fried catfish that adds a rich smoked flavour to soups and stews.",
      images: [{ src: "assets/img/meat/catfish.svg", alt: "Fried catfish", w: 480, h: 360 }],
      variants: [{ id: "1kg", label: "1kg", price: 6500 }]
    }
  };

  function getCatalog() {
    var base = window.FreshDirectCatalog;
    if (
      !base ||
      typeof base !== "object" ||
      !Object.keys(base).length
    ) {
      base = MIRROR;
    }
    var out = {};
    var ids = Object.keys(base);
    for (var i = 0; i < ids.length; i++) {
      out[ids[i]] = base[ids[i]];
    }
    try {
      if (window.FreshDirectAdminStore && window.FreshDirectAdminStore.getLocal) {
        var local = window.FreshDirectAdminStore.getLocal() || {};
        var localIds = Object.keys(local);
        for (var j = 0; j < localIds.length; j++) {
          out[localIds[j]] = local[localIds[j]];
        }
      }
    } catch (e) {
      /* Seller-kept items unavailable — the built-in records still show. */
    }
    return out;
  }

  window.FreshDirectAdminProducts = {
    source: "otoosin-demo",
    sourceNote:
      "O'Toosin Farms demonstration product records for the admin frontend.",
    mirror: MIRROR,
    getCatalog: getCatalog
  };
})();
