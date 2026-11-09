(() => {
  // web/reading-position.mjs
  var string = (x, max) => typeof x === "string" && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f<>]/.test(x);
  var integer = (x) => Number.isSafeInteger(x) && x >= 0 && x <= 1e5;
  var source = (x) => typeof x === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(x);
  function sourceRevision(data) {
    const mapped = Boolean(data.source && Object.hasOwn(data.source, "locator_revision"));
    const value = mapped ? data.source.locator_revision : data.source?.commit;
    if ((mapped || value !== void 0) && !source(value)) throw Error("The source has invalid reading-position revision metadata.");
    return value;
  }
  function assertReadingContext(context) {
    if (!context || Object.keys(context).some((k) => !["uid", "book", "kind", "plan", "day"].includes(k)) || Boolean(context.uid) === Boolean(context.book) || !string(context.uid || context.book, 300) || /https?:|javascript:|data:/i.test(context.uid || context.book) || context.kind !== void 0 && !["post", "commentary"].includes(context.kind) || context.book && context.kind || context.plan !== void 0 && (!context.uid || context.kind || !/^[a-z0-9-]{1,60}$/.test(context.plan) || !Number.isSafeInteger(context.day) || context.day < 1 || context.day > 400) || context.day !== void 0 && context.plan === void 0) throw Error("This reading position has unsupported source or reference metadata.");
  }
  function readingPosition(context, offset, ref, revision3) {
    assertReadingContext(context);
    if (!integer(offset) || !string(ref, 400) || !source(revision3)) throw Error("This reading position has unsupported source or reference metadata.");
    return "#read?" + new URLSearchParams({ ...context, offset, ref, source: revision3 });
  }
  function assertPositionPin(args, data) {
    if (!args.has("source")) return;
    if (args.getAll("source").length !== 1 || !source(args.get("source")) || !string(args.get("ref"), 400) || !/^\d+$/.test(args.get("offset") || "") || !integer(Number(args.get("offset")))) throw Error("The saved reading position is incomplete. Open its source from the Library; no nearby passage was substituted.");
    if (sourceRevision(data) !== args.get("source")) {
      const error = Error("The source or citation mapping revision changed since this reading position was saved. Review the current source explicitly before continuing; no replacement wording was displayed.");
      error.code = "READING_SOURCE_CHANGED";
      throw error;
    }
  }
  function isReadingLocator(href) {
    try {
      if (typeof href !== "string" || href.length > 8192 || !href.startsWith("#read?")) return false;
      const args = new URLSearchParams(href.slice(6)), keys2 = [...args.keys()];
      if (keys2.some((k) => !["uid", "book", "kind", "plan", "day", "offset", "ref", "source"].includes(k)) || new Set(keys2).size !== keys2.length) return false;
      const context = Object.fromEntries(["uid", "book", "kind", "plan"].filter((k) => args.has(k)).map((k) => [k, args.get(k)]));
      if (args.has("day")) context.day = Number(args.get("day"));
      if (args.has("offset") && !/^\d+$/.test(args.get("offset"))) return false;
      readingPosition(context, args.has("offset") ? Number(args.get("offset")) : 0, args.has("ref") ? args.get("ref") : "legacy/1", args.has("source") ? args.get("source") : "legacy");
      if (args.has("source")) assertPositionPin(args, { source: { commit: args.get("source") } });
      return true;
    } catch {
      return false;
    }
  }

  // web/bookmark-location.mjs
  function bookmarkLocation(item, context) {
    if (!item || typeof item.ref !== "string" || !item.ref) throw Error("This bookmark has no valid passage reference. Export it before repairing its metadata.");
    if (item.offset !== void 0 && (!Number.isSafeInteger(item.offset) || item.offset < 0 || item.offset > 1e5)) throw Error("This bookmark has invalid saved-position metadata. Keep/export it before reviewing its source separately.");
    const pinned = item.source_commit !== void 0;
    if (pinned && (!Number.isSafeInteger(item.offset) || item.offset < 0)) throw Error("This versioned bookmark has no exact saved position. Its source version was not dropped or guessed. Keep/export the bookmark and review its source separately.");
    const index = Number.isSafeInteger(item.offset) && item.offset >= 0 ? item.offset : Number(item.ref.match(/\/c?(\d+)$/)?.[1] || 1) - 1;
    const offset = pinned ? item.offset : Math.floor(index / 30) * 30;
    const href = readingPosition(context, offset, item.ref, pinned ? item.source_commit : "legacy");
    if (pinned) return { href, pinned: true, notice: "Saved source version: opening checks the revision before displaying wording." };
    const args = new URLSearchParams(href.slice(6));
    args.delete("source");
    return { href: "#read?" + args, pinned: false, notice: "Legacy bookmark: no source version was saved. Opening checks its reference against the current source; this is not a saved copy of the old wording." };
  }

  // web/saved-passages.mjs
  var SAVED_PAGE_SIZE = 25;
  function savedScope(item) {
    const uid2 = typeof item?.uid === "string" ? item.uid : "";
    if (uid2.startsWith("book:")) return "books";
    if (uid2.startsWith("post:")) return "post";
    if (uid2.startsWith("commentary:") || uid2.startsWith("commentary-ref:")) return "commentary";
    return "canon";
  }
  var savedScopeLabels = Object.freeze({ canon: "Canonical text", books: "Complete root source book", commentary: "Commentary \xB7 not canon", post: "Later work \xB7 not canon" });
  var fold = (value) => (typeof value === "string" ? value : "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  function savedPage(items, drafts, { query = "", scope = "all", page = 0 } = {}) {
    const tokens = fold(query).trim().split(/\s+/u).filter(Boolean);
    const selected = Object.hasOwn(savedScopeLabels, scope) ? scope : "all";
    const matches = items.filter((item) => {
      if (selected !== "all" && savedScope(item) !== selected) return false;
      const key3 = JSON.stringify([item.uid, item.ref]);
      const note = drafts?.has(key3) ? drafts.get(key3) : item.note;
      const text5 = fold([item.title, item.uid, item.ref, note].filter((x) => typeof x === "string").join(" "));
      return tokens.every((token) => text5.includes(token));
    });
    const pages = Math.max(1, Math.ceil(matches.length / SAVED_PAGE_SIZE));
    const current = Number.isSafeInteger(page) ? Math.max(0, Math.min(page, pages - 1)) : 0;
    return { items: matches.slice(current * SAVED_PAGE_SIZE, (current + 1) * SAVED_PAGE_SIZE), total: matches.length, all: items.length, pages, page: current, start: matches.length ? current * SAVED_PAGE_SIZE + 1 : 0, end: Math.min((current + 1) * SAVED_PAGE_SIZE, matches.length) };
  }

  // web/print-page.mjs
  function installPagePrinting(doc = document, win = window) {
    const view2 = doc.getElementById("view");
    const sheet = doc.createElement("article");
    sheet.id = "print-document";
    sheet.setAttribute("aria-hidden", "true");
    doc.body.append(sheet);
    const add = (parent, tag, text5, className) => {
      const node = doc.createElement(tag);
      node.textContent = text5;
      if (className) node.className = className;
      parent.append(node);
      return node;
    };
    const routes = /* @__PURE__ */ new WeakMap();
    const reading = () => win.location.hash.startsWith("#read?") && view2.querySelector('section[aria-label="P\u0101li passage"]');
    function prepare() {
      sheet.replaceChildren();
      const passage = reading();
      const attribution = view2.querySelector(":scope > .provenance");
      if (!passage || routes.get(passage) !== win.location.hash || !passage.querySelector(".segment .passage") || !attribution) {
        add(sheet, "h1", "No P\u0101li page ready to print");
        add(sheet, "p", "Open a P\u0101li passage and wait for its source attribution before printing. Personal notes and other screens are not printed.");
        return false;
      }
      add(sheet, "p", view2.querySelector(":scope > .eyebrow")?.textContent || "P\u0101li Library");
      add(sheet, "h1", view2.querySelector(":scope > h2")?.textContent || "P\u0101li passage");
      add(sheet, "p", "Loaded P\u0101li page only \u2014 not necessarily the complete work. English, study material, bookmarks and personal notes are excluded.", "print-scope");
      const range = [...view2.querySelectorAll(":scope > p.muted")].find((node) => node.textContent.startsWith("Segments "));
      if (range) add(sheet, "p", range.textContent, "print-scope");
      for (const notice of view2.querySelectorAll(":scope > .notice")) add(sheet, "p", notice.textContent, "print-scope");
      for (const segment of passage.querySelectorAll(":scope > .segment")) {
        const block = add(sheet, "section", "", "print-segment");
        add(block, "p", segment.querySelector(".segment-label span")?.textContent || "", "print-reference");
        const text5 = add(block, "p", segment.querySelector(".passage")?.textContent || "", "print-passage");
        text5.lang = "pi";
      }
      const source2 = add(sheet, "section", "", "print-provenance");
      add(source2, "h2", "Source and terms");
      for (const part of attribution.children) add(source2, "p", part.textContent);
      for (const anchor of attribution.querySelectorAll("a[href]")) add(source2, "p", anchor.textContent + ": " + anchor.href);
      const url = new URL(win.location.href);
      url.search = "";
      add(source2, "p", "Reading page: " + url.href);
      return true;
    }
    function update() {
      const passage = reading();
      if (passage && !routes.has(passage)) routes.set(passage, win.location.hash);
      const toolbar = view2.querySelector(":scope > .toolbar");
      if (!passage || !toolbar || toolbar.querySelector("[data-print-page]")) return;
      const target = toolbar.querySelector(".study-actions > .toolbar") || toolbar;
      const control = add(target, "button", "Print loaded P\u0101li page");
      control.type = "button";
      control.dataset.printPage = "";
      control.addEventListener("click", () => {
        if (prepare()) win.print();
      });
    }
    new win.MutationObserver(update).observe(view2, { childList: true, subtree: true });
    win.addEventListener("beforeprint", prepare);
    win.addEventListener("afterprint", () => sheet.replaceChildren());
    win.addEventListener("hashchange", () => sheet.replaceChildren());
    update();
  }

  // src/script.mjs
  var SCRIPTS = ["roman", "sinhala", "thai", "myanmar", "devanagari", "khmer", "lao", "lanna"];
  var SCRIPT_NAMES = {
    roman: "Roman (Latin with diacritics)",
    sinhala: "Sinhala",
    thai: "Thai",
    myanmar: "Myanmar (Burmese)",
    devanagari: "Devanagari",
    khmer: "Khmer",
    lao: "Lao",
    lanna: "Lanna (Tai Tham)"
  };
  var ALIASES = {
    roman: "roman",
    romn: "roman",
    latn: "roman",
    latin: "roman",
    iast: "roman",
    iso: "roman",
    sinhala: "sinhala",
    sinh: "sinhala",
    si: "sinhala",
    sinhalese: "sinhala",
    thai: "thai",
    th: "thai",
    myanmar: "myanmar",
    mymr: "myanmar",
    burmese: "myanmar",
    my: "myanmar",
    burma: "myanmar",
    devanagari: "devanagari",
    deva: "devanagari",
    hindi: "devanagari",
    nagari: "devanagari",
    khmer: "khmer",
    khmr: "khmer",
    km: "khmer",
    cambodian: "khmer",
    lao: "lao",
    laoo: "lao",
    laos: "lao",
    lanna: "lanna",
    lana: "lanna",
    taitham: "lanna",
    "tai tham": "lanna",
    tham: "lanna",
    "tai-tham": "lanna",
    tai_tham: "lanna"
  };
  function scriptName(name) {
    const key3 = String(name ?? "").trim().toLowerCase();
    const found = ALIASES[key3];
    if (!found) throw new Error(`Unknown script "${name}". Available: ${SCRIPTS.join(", ")}.`);
    return found;
  }
  var CONSONANTS = [
    "kh",
    "gh",
    "ch",
    "jh",
    "\u1E6Dh",
    "\u1E0Dh",
    "th",
    "dh",
    "ph",
    "bh",
    "k",
    "g",
    "\u1E45",
    "c",
    "j",
    "\xF1",
    "\u1E6D",
    "\u1E0D",
    "\u1E47",
    "t",
    "d",
    "n",
    "p",
    "b",
    "m",
    "y",
    "r",
    "l",
    "v",
    "s",
    "h",
    "\u1E37"
  ];
  var VOWELS = ["a", "\u0101", "i", "\u012B", "u", "\u016B", "e", "o"];
  var C_ORDER = [
    "k",
    "kh",
    "g",
    "gh",
    "\u1E45",
    "c",
    "ch",
    "j",
    "jh",
    "\xF1",
    "\u1E6D",
    "\u1E6Dh",
    "\u1E0D",
    "\u1E0Dh",
    "\u1E47",
    "t",
    "th",
    "d",
    "dh",
    "n",
    "p",
    "ph",
    "b",
    "bh",
    "m",
    "y",
    "r",
    "l",
    "v",
    "s",
    "h",
    "\u1E37"
  ];
  var zip = (keys2, chars) => Object.fromEntries(keys2.map((k, i) => [k, chars[i]]));
  var TABLES = {
    devanagari: {
      c: [..."\u0915\u0916\u0917\u0918\u0919\u091A\u091B\u091C\u091D\u091E\u091F\u0920\u0921\u0922\u0923\u0924\u0925\u0926\u0927\u0928\u092A\u092B\u092C\u092D\u092E\u092F\u0930\u0932\u0935\u0938\u0939\u0933"],
      v: ["\u0905", "\u0906", "\u0907", "\u0908", "\u0909", "\u090A", "\u090F", "\u0913"],
      s: ["", "\u093E", "\u093F", "\u0940", "\u0941", "\u0942", "\u0947", "\u094B"],
      virama: "\u094D",
      m: "\u0902",
      digits: [..."\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F"],
      stop: "\u0964",
      abbr: "\u0970",
      verseEnd: "\u0964",
      stanzaEnd: "\u0965",
      // VRI writes a zero-width joiner after the virama in these clusters.
      zwj: ["kk", "kl", "kv", "cc", "jj", "\xF1c", "\xF1j", "\xF1\xF1", "nn", "pl", "ll"]
    },
    sinhala: {
      c: [..."\u0D9A\u0D9B\u0D9C\u0D9D\u0D9E\u0DA0\u0DA1\u0DA2\u0DA3\u0DA4\u0DA7\u0DA8\u0DA9\u0DAA\u0DAB\u0DAD\u0DAE\u0DAF\u0DB0\u0DB1\u0DB4\u0DB5\u0DB6\u0DB7\u0DB8\u0DBA\u0DBB\u0DBD\u0DC0\u0DC3\u0DC4\u0DC5"],
      v: ["\u0D85", "\u0D86", "\u0D89", "\u0D8A", "\u0D8B", "\u0D8C", "\u0D91", "\u0D94"],
      s: ["", "\u0DCF", "\u0DD2", "\u0DD3", "\u0DD4", "\u0DD6", "\u0DD9", "\u0DDC"],
      virama: "\u0DCA",
      m: "\u0D82",
      digits: null,
      abbr: ".",
      // VRI writes ZWJ before y and r (yansaya, rakaransaya) and ZWNJ in every other cluster.
      joiner: (a, b) => b === "y" || b === "r" ? "\u200D" : "\u200C"
    },
    thai: {
      c: [..."\u0E01\u0E02\u0E04\u0E06\u0E07\u0E08\u0E09\u0E0A\u0E0C\u0E0D\u0E0F\u0E10\u0E11\u0E12\u0E13\u0E15\u0E16\u0E17\u0E18\u0E19\u0E1B\u0E1C\u0E1E\u0E20\u0E21\u0E22\u0E23\u0E25\u0E27\u0E2A\u0E2B\u0E2C"],
      v: ["\u0E2D", "\u0E2D\u0E32", "\u0E2D\u0E34", "\u0E2D\u0E35", "\u0E2D\u0E38", "\u0E2D\u0E39", "\u0E40\u0E2D", "\u0E42\u0E2D"],
      s: ["", "\u0E32", "\u0E34", "\u0E35", "\u0E38", "\u0E39", "\u0E40", "\u0E42"],
      virama: "\u0E3A",
      m: "\u0E4D",
      digits: [..."\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59"],
      prefix: true,
      stop: "\u0E2F",
      abbr: "."
    },
    myanmar: {
      c: [..."\u1000\u1001\u1002\u1003\u1004\u1005\u1006\u1007\u1008\u1009\u100B\u100C\u100D\u100E\u100F\u1010\u1011\u1012\u1013\u1014\u1015\u1016\u1017\u1018\u1019\u101A\u101B\u101C\u101D\u101E\u101F\u1020"],
      v: ["\u1021", "\u1021\u102C", "\u1023", "\u1024", "\u1025", "\u1026", "\u1027", "\u1029"],
      s: ["", "\u102C", "\u102D", "\u102E", "\u102F", "\u1030", "\u1031", "\u1031\u102C"],
      virama: "\u1039",
      final: "\u103A",
      m: "\u1036",
      digits: [..."\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049"],
      stop: "\u104B",
      abbr: ".",
      verseEnd: "\u104B",
      ellipsis: "\u104B",
      comma: "\u104A",
      // Stacks VRI writes as one letter, a medial or kinzi (applied in this order).
      ligatures: [["\u101E\u1039\u101E", "\u103F"], ["\u1009\u1039\u1009", "\u100A"], ["\u1039\u101A", "\u103B"], ["\u1039\u101B", "\u103C"], ["\u1039\u101D", "\u103D"], ["\u1039\u101F", "\u103E"], ["\u1004\u1039", "\u1004\u103A\u1039"]],
      extraIndependent: { "\u1026": "\u016B", "\u102A": "o" }
    },
    khmer: {
      c: [..."\u1780\u1781\u1782\u1783\u1784\u1785\u1786\u1787\u1788\u1789\u178A\u178B\u178C\u178D\u178E\u178F\u1790\u1791\u1792\u1793\u1794\u1795\u1796\u1797\u1798\u1799\u179A\u179B\u179C\u179F\u17A0\u17A1"],
      v: ["\u17A2", "\u17A2\u17B6", "\u17A5", "\u17A6", "\u17A7", "\u17A9", "\u17AF", "\u17B1"],
      s: ["", "\u17B6", "\u17B7", "\u17B8", "\u17BB", "\u17BC", "\u17C1", "\u17C4"],
      virama: "\u17D2",
      final: "\u17D1",
      m: "\u17C6",
      digits: [..."\u17E0\u17E1\u17E2\u17E3\u17E4\u17E5\u17E6\u17E7\u17E8\u17E9"],
      stop: "\u17D4",
      abbr: ".",
      extraIndependent: { "\u17A8": "\u016B" }
    },
    lao: {
      // Lao with the Pāli letters added in Unicode 12 (U+0E86-U+0EAC) and the Pāli virama U+0EBA.
      c: [
        "\u0E81",
        "\u0E82",
        "\u0E84",
        "\u0E86",
        "\u0E87",
        "\u0E88",
        "\u0E89",
        "\u0E8A",
        "\u0E8C",
        "\u0E8E",
        "\u0E8F",
        "\u0E90",
        "\u0E91",
        "\u0E92",
        "\u0E93",
        "\u0E95",
        "\u0E96",
        "\u0E97",
        "\u0E98",
        "\u0E99",
        "\u0E9B",
        "\u0E9C",
        "\u0E9E",
        "\u0EA0",
        "\u0EA1",
        "\u0E8D",
        "\u0EA3",
        "\u0EA5",
        "\u0EA7",
        "\u0EAA",
        "\u0EAB",
        "\u0EAC"
      ],
      v: ["\u0EAD", "\u0EAD\u0EB2", "\u0EAD\u0EB4", "\u0EAD\u0EB5", "\u0EAD\u0EB8", "\u0EAD\u0EB9", "\u0EC0\u0EAD", "\u0EC2\u0EAD"],
      s: ["", "\u0EB2", "\u0EB4", "\u0EB5", "\u0EB8", "\u0EB9", "\u0EC0", "\u0EC2"],
      virama: "\u0EBA",
      m: "\u0ECD",
      digits: [..."\u0ED0\u0ED1\u0ED2\u0ED3\u0ED4\u0ED5\u0ED6\u0ED7\u0ED8\u0ED9"],
      prefix: true
    },
    lanna: {
      // Tai Tham is stored in logical order; sakot (U+1A60) stacks clusters and
      // the visible asat (U+1A7A) marks a consonant with no vowel.
      c: [
        "\u1A20",
        "\u1A21",
        "\u1A23",
        "\u1A25",
        "\u1A26",
        "\u1A27",
        "\u1A28",
        "\u1A29",
        "\u1A2B",
        "\u1A2C",
        "\u1A2D",
        "\u1A2E",
        "\u1A2F",
        "\u1A30",
        "\u1A31",
        "\u1A32",
        "\u1A33",
        "\u1A34",
        "\u1A35",
        "\u1A36",
        "\u1A37",
        "\u1A39",
        "\u1A3B",
        "\u1A3D",
        "\u1A3E",
        "\u1A3F",
        "\u1A41",
        "\u1A43",
        "\u1A45",
        "\u1A48",
        "\u1A49",
        "\u1A4A"
      ],
      v: ["\u1A4B", "\u1A4B\u1A63", "\u1A4D", "\u1A4E", "\u1A4F", "\u1A50", "\u1A51", "\u1A52"],
      s: ["", "\u1A63", "\u1A65", "\u1A66", "\u1A69", "\u1A6A", "\u1A6E", "\u1A6E\u1A63"],
      virama: "\u1A60",
      final: "\u1A7A",
      m: "\u1A74",
      digits: [..."\u1A90\u1A91\u1A92\u1A93\u1A94\u1A95\u1A96\u1A97\u1A98\u1A99"],
      extraIndependent: { "\u1A4C": "\u0101" },
      extraSigns: { "\u1A64": "\u0101", "\u1A70": "o" },
      // Subjoined letters and the great sa some Lanna texts use; accepted on input.
      expand: [["\u1A55", "\u1A60\u1A41"], ["\u1A56", "\u1A60\u1A43"], ["\u1A54", "\u1A48\u1A60\u1A48"]]
    }
  };
  var MYMR_TALL = /([ခဂပဝ]|ဒ္ဓ)(ေ?)ာ/g;
  for (const t of Object.values(TABLES)) {
    t.cons = zip(C_ORDER, t.c);
    t.ind = zip(VOWELS, t.v);
    t.sign = zip(VOWELS, t.s);
    t.zwj = new Set(t.zwj ?? []);
  }
  var ROMAN_TOKENS = [...CONSONANTS, ...VOWELS, "\u1E43"];
  var PE = "\uE000";
  var STOP = "\uE001";
  var STANZA = "\uE002";
  function* romanTokens(s) {
    for (let i = 0; i < s.length; ) {
      let tok = null;
      for (const t of ROMAN_TOKENS) if (s.startsWith(t, i)) {
        tok = t;
        break;
      }
      if (tok) {
        yield { kind: tok === "\u1E43" ? "m" : VOWELS.includes(tok) ? "v" : "c", tok };
        i += tok.length;
      } else {
        if (s[i] === "\u1E41" || s[i] === "\u014B") yield { kind: "m", tok: "\u1E43" };
        else yield { kind: "o", tok: s[i] };
        i += 1;
      }
    }
  }
  function romanPunctuation(s, t, stanza) {
    if (stanza && t.stanzaEnd) s = s.replace(/\.(\)?\s*)$/, `${STANZA}$1`);
    if (t.abbr) {
      s = s.replace(/…(\s*)(pe)…/gi, `\u2026$1$2${PE}\u2026`);
      s = s.replace(/(?<=(?:^|[\s(.])\p{Ll}{1,6})\.(?=\s*[\p{Ll}\d)])/gu, PE);
    }
    if (t.stop) s = s.replace(/(?<![0-9])\./g, STOP);
    if (t.verseEnd) s = s.replace(/;(\s*)$/, `${STOP}$1`);
    return s;
  }
  function fromRoman(text5, script, stanza) {
    const t = TABLES[script];
    const s = romanPunctuation(text5.normalize("NFC"), t, stanza).toLowerCase();
    let out = "";
    let pending = null;
    let consStart = -1;
    for (const { kind, tok } of romanTokens(s)) {
      if (kind === "c") {
        if (pending) {
          out += t.virama;
          if (t.zwj.has(pending + tok)) out += "\u200D";
          else if (t.joiner) out += t.joiner(pending, tok);
        }
        consStart = out.length;
        out += t.cons[tok];
        pending = tok;
      } else if (kind === "v") {
        if (pending) {
          const sign = t.sign[tok];
          if (t.prefix && (tok === "e" || tok === "o")) out = out.slice(0, consStart) + sign + out.slice(consStart);
          else out += sign;
          pending = null;
        } else {
          out += t.ind[tok];
        }
      } else {
        if (pending) {
          out += t.final ?? t.virama;
          pending = null;
        }
        if (kind === "m") out += t.m;
        else if (tok >= "0" && tok <= "9") out += t.digits ? t.digits[tok.charCodeAt(0) - 48] : tok;
        else if (tok === PE) out += t.abbr;
        else if (tok === STOP) out += t.stop;
        else if (tok === STANZA) out += t.stanzaEnd;
        else if (tok === "\u2026" && t.ellipsis) out += t.ellipsis;
        else if (tok === "," && t.comma) out += t.comma;
        else out += tok;
      }
    }
    if (pending) out += t.final ?? t.virama;
    if (t.ligatures) for (const [a, b] of t.ligatures) out = out.split(a).join(b);
    if (script === "myanmar") out = out.replace(MYMR_TALL, "$1$2\u102B");
    return out;
  }
  var REVERSE = {};
  function reverse(script) {
    if (REVERSE[script]) return REVERSE[script];
    const t = TABLES[script];
    const cons = new Map(C_ORDER.map((r) => [t.cons[r], r]));
    const carrier = t.ind.a;
    cons.set(carrier, "");
    const ind = /* @__PURE__ */ new Map();
    for (const r of VOWELS) if (r !== "a" && !t.ind[r].startsWith(carrier)) ind.set(t.ind[r], r);
    for (const [k, v] of Object.entries(t.extraIndependent ?? {})) ind.set(k, v);
    const signs = new Map(VOWELS.filter((r) => t.sign[r] && !(t.prefix && (r === "e" || r === "o"))).map((r) => [t.sign[r], r]));
    for (const [k, v] of Object.entries(t.extraSigns ?? {})) signs.set(k, v);
    const punct = /* @__PURE__ */ new Map();
    if (t.stop) punct.set(t.stop, ".");
    if (t.stanzaEnd) punct.set(t.stanzaEnd, ".");
    if (t.abbr) punct.set(t.abbr, ".");
    if (t.ellipsis) punct.set(t.ellipsis, ".");
    if (t.comma) punct.set(t.comma, ",");
    if (t.digits) t.digits.forEach((d, i) => punct.set(d, String(i)));
    const expand = [...t.expand ?? []];
    if (t.ligatures) for (const [a, b] of [...t.ligatures].reverse()) expand.push([b, a]);
    if (script === "myanmar") expand.push(["\u102B", "\u102C"]);
    const byLength = (m) => [...m.keys()].sort((a, b) => b.length - a.length);
    const prefixes = t.prefix ? /* @__PURE__ */ new Map([[t.sign.e, "e"], [t.sign.o, "o"]]) : /* @__PURE__ */ new Map();
    return REVERSE[script] = { t, cons, ind, signs, signList: byLength(signs), indList: byLength(ind), punct, expand, prefixes };
  }
  function toRomanFrom(text5, script) {
    const R = reverse(script);
    const { t } = R;
    let s = text5.normalize("NFC").replace(/[\u200c\u200d]/g, "");
    for (const [a, b] of R.expand) s = s.split(a).join(b);
    const at = (i, list) => list.find((x) => s.startsWith(x, i));
    let out = "";
    for (let i = 0; i < s.length; ) {
      let prefix = null;
      if (R.prefixes.has(s[i]) && R.cons.has(s[i + 1])) {
        prefix = R.prefixes.get(s[i]);
        i += 1;
      }
      const c = s[i];
      if (R.cons.has(c)) {
        out += R.cons.get(c);
        i += 1;
        if (prefix) out += prefix;
        else if (s[i] === t.virama || t.final && s[i] === t.final) i += 1;
        else {
          const sign = at(i, R.signList);
          if (sign) {
            out += R.signs.get(sign);
            i += sign.length;
          } else out += "a";
        }
        continue;
      }
      const v = at(i, R.indList);
      if (v) {
        out += R.ind.get(v);
        i += v.length;
        continue;
      }
      if (c === t.m) {
        out += "\u1E43";
        i += 1;
        continue;
      }
      out += R.punct.get(c) ?? c;
      i += 1;
    }
    if (t.abbr) out = out.replace(/[.…](\s*)pe\.[.…]/g, "\u2026$1pe\u2026");
    return out;
  }
  var RANGES = [
    ["devanagari", 2304, 2431],
    ["sinhala", 3456, 3583],
    ["thai", 3584, 3711],
    ["lao", 3712, 3839],
    ["myanmar", 4096, 4255],
    ["khmer", 6016, 6143],
    ["lanna", 6688, 6831]
  ];
  function detectScript(text5) {
    const counts = {};
    for (const ch of String(text5 ?? "")) {
      const cp = ch.codePointAt(0);
      if (cp < 2304) continue;
      for (const [name, lo, hi] of RANGES) if (cp >= lo && cp <= hi) {
        counts[name] = (counts[name] ?? 0) + 1;
        break;
      }
    }
    let best = "roman";
    let n = 0;
    for (const [name, c] of Object.entries(counts)) if (c > n) {
      best = name;
      n = c;
    }
    return best;
  }
  function transliterate(text5, from, to, { stanza = false } = {}) {
    if (text5 == null) return text5;
    const s = String(text5);
    const a = from === "auto" ? detectScript(s) : scriptName(from);
    const b = scriptName(to);
    if (a === b) return s;
    const roman = a === "roman" ? s : toRomanFrom(s, a);
    return b === "roman" ? roman : fromRoman(roman, b, stanza);
  }
  function inputNote(input) {
    return input?.original ? { input_script: input.script, input_romanized: input.text } : {};
  }
  function scriptNote(script) {
    return {
      script,
      script_note: `P\u0101li transliterated into ${SCRIPT_NAMES[script]} by this server from the VRI Roman edition (exact letter-for-letter; punctuation follows VRI's own script editions where they exist). Citations, IDs and English are left in Roman.`
    };
  }
  var pali = (text5, script, opts) => typeof text5 === "string" && text5 ? transliterate(text5, "roman", script, opts) : text5;
  function verse(text5, script) {
    const lines = text5.split("\n");
    return lines.map((line, i) => pali(line, script, { stanza: i === lines.length - 1 })).join("\n");
  }
  function localizeUnitFields(obj, script) {
    const out = { ...obj };
    if (typeof out.title === "string") {
      out.title_roman = out.title;
      out.title = pali(out.title, script);
    }
    if (typeof out.vri_book === "string") out.vri_book = pali(out.vri_book, script);
    if (typeof out.excerpt === "string") out.excerpt = pali(out.excerpt, script);
    return out;
  }
  function localizeText(result, script, input) {
    const s = script ? scriptName(script) : "roman";
    if (s === "roman") return { ...result, ...inputNote(input) };
    const out = localizeUnitFields(result, s);
    out.segments = (result.segments ?? []).map((seg) => {
      const x = { ...seg };
      if (typeof x.text === "string") x.text = x.type === "verse" ? verse(x.text, s) : pali(x.text, s);
      if (Array.isArray(x.variant_readings)) x.variant_readings = x.variant_readings.map((v) => pali(v, s));
      if (Array.isArray(x.variants)) x.variants = x.variants.map((v) => ({
        ...v,
        raw: pali(v.raw, s),
        readings: (v.readings ?? []).map((r) => ({ ...r, reading: pali(r.reading, s) })),
        omissions: (v.omissions ?? []).map((o) => ({ ...o, text: pali(o.text, s) })),
        remarks: (v.remarks ?? []).map((r) => pali(r, s))
      }));
      return x;
    });
    if (Array.isArray(result.pali_opening)) out.pali_opening = result.pali_opening;
    return { ...out, ...scriptNote(s), ...inputNote(input) };
  }

  // web/translation-policy.mjs
  var own = (value, key3) => value && Object.hasOwn(value, key3);
  var nonempty = (value) => typeof value === "string" && value.trim().length > 0;
  var sha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  var stable = (value) => JSON.stringify(Array.isArray(value) ? value.map((v) => JSON.parse(stable(v))) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, JSON.parse(stable(value[k]))])) : value);
  var sameScope = (a, b) => stable(a) === stable(b);
  function scopeDescriptor(choice, requestedId) {
    if (!own(choice, "translation_scope")) return null;
    const scope = choice.translation_scope;
    const fail3 = () => {
      throw new Error("This source has an unsupported or incomplete scope declaration. No scoped source was requested. Reload the passage and review the updated sources.");
    };
    if (!scope || ![1, 2].includes(scope.version) || scope.whole_unit_coverage !== false || !sha(scope.scope_sha256) || !sha(scope.text_sha256) || !sha(scope.pali_sha256) || !nonempty(scope.source_commit) || !nonempty(scope.note) || !nonempty(choice.translation_id)) fail3();
    if (scope.kind === "shared_page") {
      if (scope.version !== 1) fail3();
      const ids = scope.text_ids;
      const presentation = scope.presentation || (scope.condensed === true ? "condensed" : null);
      if (!Array.isArray(ids) || ids.length < 2 || ids.length > 32 || ids.some((id2) => !nonempty(id2) || id2.length > 300) || new Set(ids).size !== ids.length || !ids.includes(requestedId) || scope.owner_id !== ids[0] || scope.individual_alignment_verified !== false || !nonempty(scope.source_reference) || !["condensed", "compilation"].includes(presentation) || presentation === "compilation" && !sha(scope.notice_sha256) || own(scope, "condensed") && scope.condensed !== (presentation === "condensed")) fail3();
      return { kind: scope.kind, label: presentation === "compilation" ? "Shared compilation page" : "Shared condensed page", scope: JSON.parse(JSON.stringify(scope)), flags: { allow_shared: true, scope_sha256: scope.scope_sha256 } };
    }
    if (scope.kind === "partial_unit") {
      const prefix = requestedId + "/";
      if (choice.translation_id.startsWith("ati:") && (!(scope.version === 2 ? ["ati-chapter-prose-v1", "ati-chapter-p5-of5-no-notes-v1", "ati-chapter-p1to4-of5-notes-v1"].includes(scope.extractor) : ["ati-freeverse-v1", "ati-chapter-p2-of2-v1", "ati-chapter-p11-of11-v1", "ati-chapter-p1-of4-v1", "ati-chapter-p14-of24-v1", "ati-excerpt-verse-pre-v1", "ati-chapter-p1to3-of4-ellipsis-v1"].includes(scope.extractor)) || !sha(scope.notice_sha256))) fail3();
      if (scope.version === 2) {
        const p = scope.pali_excerpt;
        if (!choice.translation_id.startsWith("ati:") || scope.first_ref !== scope.last_ref || !p || p.ref !== scope.first_ref || p.type !== "prose" || !nonempty(p.text) || p.text.length > 2e6 || p.offset_unit !== "utf16_code_units" || !sha(p.segment_sha256) || !Number.isSafeInteger(p.start_char) || !Number.isSafeInteger(p.end_char) || p.start_char < 0 || p.end_char <= p.start_char || p.end_char - p.start_char !== p.text.length || own(scope, "read_with") || own(scope, "read_pages")) fail3();
      } else if (own(scope, "pali_excerpt")) fail3();
      if (scope.unit_id !== requestedId || !nonempty(scope.first_ref) || !nonempty(scope.last_ref) || !scope.first_ref.startsWith(prefix) || !scope.last_ref.startsWith(prefix) || !/^[1-9]\d*$/.test(scope.first_ref.slice(prefix.length)) || !/^[1-9]\d*$/.test(scope.last_ref.slice(prefix.length)) || Number(scope.first_ref.slice(prefix.length)) > Number(scope.last_ref.slice(prefix.length))) fail3();
      return { kind: scope.kind, label: "Partial-unit source", scope: JSON.parse(JSON.stringify(scope)), flags: { allow_partial: true, scope_sha256: scope.scope_sha256 } };
    }
    fail3();
  }
  function validateEnglishPage(data, args, context) {
    const offset = args.offset || 0;
    if (!data || !nonempty(data.text) || !nonempty(data.translation_id) || !nonempty(data.translator) || !nonempty(data.attribution) || !(nonempty(data.license) || data.license && typeof data.license === "object" && nonempty(data.license.name)) || data.offset !== offset) throw new Error("The English source response is incomplete. No translation was displayed.");
    const choice = context.choices.find((c) => c.translation_id === data.translation_id);
    if (!choice) throw new Error("The returned English source version was not in the reviewed list. Reload the passage and review sources again.");
    if (context.accepted) {
      const accepted = context.accepted;
      if (data.translation_id !== args.translation || data.whole_unit_coverage !== false || !own(data, "translation_scope") || !sameScope(data.translation_scope, accepted.scope)) throw new Error("The source scope or version changed after review. Reload the passage and give fresh consent; no scoped text was displayed.");
      if (accepted.kind === "shared_page") {
        if (args.allow_shared !== true || args.allow_partial === true || data.text_id !== null || data.requested_text_id !== context.uid || data.citation !== accepted.scope.source_reference) throw new Error("A shared page was incorrectly attributed to an individual discourse. No scoped text was displayed.");
      } else if (args.allow_partial !== true || args.allow_shared === true || data.text_id !== context.uid) throw new Error("The partial source no longer matches the reviewed unit. No scoped text was displayed.");
      if (args.scope_sha256 !== accepted.scope.scope_sha256) throw new Error("The scope consent is missing its reviewed mapping pin.");
    } else if (own(data, "translation_scope") || data.whole_unit_coverage === false || own(choice, "translation_scope") || data.text_id !== context.uid || args.allow_shared === true || args.allow_partial === true) throw new Error("This response needs a separate scope review. No partial/shared page was displayed as a whole-text translation.");
    if (data.next_offset === null || data.next_offset === void 0) {
      if (data.continue_with != null) throw new Error("The source returned an inconsistent continuation. Reload its first page.");
      return null;
    }
    const next = data.continue_with?.arguments;
    if (data.continue_with?.name !== "get_translation" || !next || next.uid !== context.uid || next.translation !== data.translation_id || !Number.isSafeInteger(next.offset) || next.offset <= offset || next.offset > 2e6 || next.offset !== data.next_offset || !sha(next.prefix_sha256) || !Number.isInteger(next.limit) || next.limit < 500 || next.limit > 3e4) throw new Error("The source returned an unsafe continuation. No next-page request was made.");
    if (context.accepted) {
      const shared = context.accepted.kind === "shared_page";
      if (next.scope_sha256 !== context.accepted.scope.scope_sha256 || next[shared ? "allow_shared" : "allow_partial"] !== true || next[shared ? "allow_partial" : "allow_shared"] === true) throw new Error("The next page dropped or changed its scope consent. Review the source again.");
    } else if (next.allow_shared === true || next.allow_partial === true || own(next, "scope_sha256")) throw new Error("The next page unexpectedly changes source scope. Review it separately.");
    return JSON.parse(JSON.stringify(next));
  }

  // web/reading-plans.mjs
  var nameOK = (n) => typeof n === "string" && /^[a-z0-9-]{1,60}$/.test(n);
  var text = (x) => typeof x === "string" && x.trim().length > 0;
  function planCatalog(data) {
    if (!Array.isArray(data?.plans) || !data.plans.length || data.plans.length > 20 || new Set(data.plans.map((p) => p.name)).size !== data.plans.length || data.plans.some((p) => !nameOK(p.name) || !text(p.title) || !text(p.description) || !Number.isInteger(p.days) || p.days < 1 || p.days > 400)) throw Error("The reading-plan catalogue is incomplete. No plan was substituted.");
    return data.plans;
  }
  function planDay(data, name, day) {
    if (!nameOK(name) || data?.name !== name || data.day !== day || !Number.isInteger(day) || day < 1 || !Number.isInteger(data.days) || data.days < day || data.days > 400 || !text(data.title) || !text(data.source?.pali?.commit) || !text(data.source.pali.attribution) || !text(data.source.pali.terms) || !Array.isArray(data.readings) || !data.readings.length || data.readings.length > 20) throw Error("The selected plan day is incomplete or changed. No reading was substituted.");
    for (const r of data.readings) {
      const a = r.get_text;
      if (!text(r.id) || !text(r.citation) || !a || a.uid !== r.id || Object.keys(a).some((k) => !["uid", "offset", "limit"].includes(k)) || a.offset !== void 0 && (!Number.isInteger(a.offset) || a.offset < 0 || a.offset > 1e5) || a.limit !== void 0 && (!Number.isInteger(a.limit) || a.limit < 1 || a.limit > 1e5) || a.offset !== void 0 && a.limit === void 0 || r.part !== void 0 && (!Number.isInteger(r.part) || !Number.isInteger(r.of) || r.part < 1 || r.part > r.of || a.limit === void 0)) throw Error("The plan contains an unsupported reading span. No reading was substituted.");
    }
    if (new Set(data.readings.map((r) => r.id)).size !== data.readings.length) throw Error("The plan contains ambiguous duplicate reading selections.");
    return data;
  }
  function daySignature(data) {
    return JSON.stringify({ name: data.name, day: data.day, source: data.source.pali.commit, readings: data.readings.map((r) => ({ id: r.id, offset: r.get_text.offset ?? 0, limit: r.get_text.limit ?? null, part: r.part ?? null, of: r.of ?? null })) });
  }
  function cleanProgress(value) {
    if (!Array.isArray(value)) return [];
    const seen = /* @__PURE__ */ new Set();
    return value.filter((x) => {
      const key3 = x?.name + ":" + x?.day;
      if (!x || !nameOK(x.name) || !Number.isInteger(x.day) || x.day < 1 || x.day > 400 || typeof x.signature !== "string" || x.signature.length > 12e3 || seen.has(key3)) return false;
      seen.add(key3);
      return true;
    }).slice(0, 1600);
  }
  function planWindow(data, uid2, requestedOffset) {
    const reading = data.readings.find((r) => r.id === uid2);
    if (!reading) throw Error("This text is not in the selected plan day.");
    const start = reading.get_text.offset ?? 0, end = reading.get_text.limit === void 0 ? null : start + reading.get_text.limit;
    const offset = requestedOffset ?? start;
    if (!Number.isInteger(offset) || offset < start || end !== null && offset >= end) throw Error("This reading position is outside the selected plan day. Return to the plan to open its assigned span.");
    return { start, end, offset, limit: end === null ? 30 : Math.min(30, end - offset) };
  }
  function validatePlanPage(data, plan, uid2, window2) {
    if (data.text_id !== uid2 || data.source?.commit !== plan.source.pali.commit || data.offset !== window2.offset || !Array.isArray(data.segments) || data.returned !== data.segments.length || !data.returned || data.returned > window2.limit || window2.end !== null && data.returned !== window2.limit) throw Error("The P\u0101li response does not match the selected plan span and source revision. No plan passage was displayed.");
  }

  // web/bookmark-import.mjs
  var MAX_IMPORT_BYTES = 16 * 1024 * 1024;
  var keys = /* @__PURE__ */ new Set(["uid", "ref", "title", "note", "offset", "source_commit"]);
  var string2 = (x, max) => typeof x === "string" && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f]/.test(x);
  var object = (x) => x && typeof x === "object" && !Array.isArray(x);
  var identity = (x) => JSON.stringify([x.uid, x.ref]);
  function parseBookmarks(text5) {
    let data;
    try {
      data = JSON.parse(text5);
    } catch {
      throw Error("Choose a valid JSON bookmark export. Nothing was imported.");
    }
    if (!object(data) || data.format !== "pali-library-v1" || Object.keys(data).some((k) => !["format", "saved"].includes(k)) || !Array.isArray(data.saved) || data.saved.length > 500) throw Error("This is not a supported P\u0101li Library bookmark export (maximum 500 passages). Nothing was imported.");
    const seen = /* @__PURE__ */ new Set();
    return data.saved.map((x) => {
      if (!object(x) || Object.keys(x).some((k) => !keys.has(k)) || !string2(x.uid, 300) || !string2(x.ref, 400) || !string2(x.title, 1e3) || !(/^[a-z][a-z0-9.-]*$/.test(x.uid) || /^(book|post|commentary-ref|commentary):[^\r\n]+$/.test(x.uid)) || /https?:|javascript:|data:|[<>]/i.test(x.uid) || x.note !== void 0 && (typeof x.note !== "string" || x.note.length > 4e3) || x.offset !== void 0 && (!Number.isSafeInteger(x.offset) || x.offset < 0 || x.offset > 1e5) || x.source_commit !== void 0 && !string2(x.source_commit, 100)) throw Error("A bookmark has unsupported fields or invalid reference, note, position or revision metadata. Nothing was imported.");
      if (seen.has(identity(x))) throw Error("The file contains duplicate passage references. Resolve those duplicates before importing; no notes were chosen or discarded.");
      seen.add(identity(x));
      return { uid: x.uid, ref: x.ref, title: x.title, note: x.note ?? "", ...x.offset !== void 0 ? { offset: x.offset } : {}, ...x.source_commit !== void 0 ? { source_commit: x.source_commit } : {} };
    });
  }
  function bookmarkMerge(existing, incoming) {
    const seen = new Set(existing.map(identity)), added = incoming.filter((x) => !seen.has(identity(x))), skipped = incoming.length - added.length;
    if (existing.length + added.length > 500) throw Error("These new bookmarks exceed the 500-passage limit. Export/remove some saved passages, then try again. Nothing was imported.");
    return { added, skipped, saved: [...existing, ...added] };
  }

  // web/daily-reading.mjs
  var text2 = (x) => typeof x === "string" && x.trim().length > 0;
  function validateDaily(data, { date, kind }) {
    const instant = typeof data?.date === "string" ? /* @__PURE__ */ new Date(data.date + "T00:00:00Z") : null;
    if (!instant || !Number.isFinite(instant.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || instant.toISOString().slice(0, 10) !== data.date || data.date.startsWith("0000") || date !== void 0 && data.date !== date || !["verse", "sutta"].includes(kind) || data.kind !== kind || !text2(data.text?.id) || !text2(data.text.citation) || !/^([a-z][a-z0-9.-]*)$/.test(data.text.id) || data.read_with?.tool !== "get_text" || data.read_with.uid !== data.text.id || !text2(data.how_chosen) || !Number.isInteger(data.rotation?.position) || !Number.isInteger(data.rotation?.of) || data.rotation.position < 1 || data.rotation.position > data.rotation.of || !text2(data.source?.pali?.name) || !text2(data.source.pali.commit) || !text2(data.source.pali.attribution) || !text2(data.source.pali.terms)) throw Error("The daily selection is incomplete or does not match the requested date, kind and source. No other reading was substituted.");
    if (data.notes !== void 0 && (!Array.isArray(data.notes) || data.notes.some((n) => typeof n !== "string"))) throw Error("The daily source notes are incomplete.");
    if (data.chapter !== void 0 && data.chapter !== null) {
      const range = typeof data.chapter.id === "string" && data.chapter.id.match(/^dhp(\d+)-(\d+)$/), verse2 = Number(data.text.id.slice(3));
      if (kind !== "verse" || !range || !text2(data.chapter.citation) || verse2 < Number(range[1]) || verse2 > Number(range[2])) throw Error("The daily chapter context does not match the selected verse.");
    }
    if (kind === "verse") {
      if (!/^dhp\d+$/.test(data.text.id) || !Array.isArray(data.pali) || !data.pali.length || data.pali.length > 100 || data.pali.some((s) => !text2(s.ref) || !s.ref.startsWith(data.text.id + "/") || s.type !== "verse" || !text2(s.text)) || new Set(data.pali.map((s) => s.ref)).size !== data.pali.length) throw Error("The daily verse lacks its exact referenced source text. No verse was displayed.");
    } else if (!text2(data.first_line) || !Number.isInteger(data.segments) || data.segments < 1) throw Error("The daily discourse opening is incomplete. No full discourse was inferred from it.");
    return data;
  }

  // web/quote-check.mjs
  function validatePaliQuote(data, quote) {
    const fail3 = () => {
      throw Error("The quotation result is incomplete or does not match this P\u0101li request. No verdict or substitute source was displayed.");
    };
    const text5 = (x) => typeof x === "string" && x.length > 0;
    const integer5 = (x) => Number.isSafeInteger(x) && x >= 0;
    if (!data || data.quote !== quote || data.language !== "pali" || !["found", "close_paraphrase", "not_found_in_scope"].includes(data.verdict) || !text5(data.explanation) || !text5(data.guidance) || data.scope?.language !== "pali" || !text5(data.scope.searched) || !text5(data.scope.attribution) || !text5(data.scope.terms) || data.comparison?.verbatim !== "not_assessed" || !text5(data.comparison?.note) || !["normalized_fuzzy", "literal_source_substring"].includes(data.comparison.method) || !text5(data.thresholds?.measure) || !Array.isArray(data.matches) || data.matches.length > 5) fail3();
    if (data.equally_similar_texts !== void 0 && (!Number.isSafeInteger(data.equally_similar_texts) || data.equally_similar_texts < 2 || !text5(data.citation_note))) fail3();
    for (const m of data.matches) {
      const command2 = m.read_with, span = m.source_span;
      if (!/^[a-z][a-z0-9.-]*$/.test(m.text_id || "") || !text5(m.citation) || !text5(m.matched_text) || !text5(m.edition) || !text5(m.segment_ref) || typeof m.similarity !== "number" || !Number.isFinite(m.similarity) || m.similarity < 0 || m.similarity > 1 || command2?.tool !== "get_text" || command2.uid !== m.text_id || !integer5(command2.offset) || !integer5(command2.limit) || command2.limit < 1 || command2.limit > 200 || span?.offset !== command2.offset || span.first_segment_ref !== m.segment_ref || !integer5(span.end_offset) || span.end_offset <= span.offset || !text5(span.last_segment_ref)) fail3();
    }
    if (data.verdict !== "not_found_in_scope" && !data.matches.length) fail3();
    return data;
  }

  // web/progress-import.mjs
  var MAX_PROGRESS_BYTES = 16 * 1024 * 1024;
  var MAX_PROGRESS_MARKS = 1600;
  var object2 = (x) => x && typeof x === "object" && !Array.isArray(x);
  var exact = (x, keys2) => object2(x) && Object.keys(x).length === keys2.length && keys2.every((k) => Object.hasOwn(x, k));
  var integer2 = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
  var key = (x) => x.name + ":" + x.day;
  function parseProgressMetadata(text5) {
    const fail3 = () => {
      throw Error("This is not a supported reading-progress export. No marks were restored.");
    };
    let data;
    try {
      data = JSON.parse(text5);
    } catch {
      fail3();
    }
    if (!exact(data, ["format", "progress"]) || data.format !== "pali-library-reading-progress-v1" || !Array.isArray(data.progress) || data.progress.length > MAX_PROGRESS_MARKS) fail3();
    const seen = /* @__PURE__ */ new Set();
    return data.progress.map((mark) => {
      if (!exact(mark, ["name", "day", "signature"]) || typeof mark.name !== "string" || !/^[a-z0-9-]{1,60}$/.test(mark.name) || !integer2(mark.day, 1, 400) || typeof mark.signature !== "string" || mark.signature.length > 12e3 || seen.has(key(mark))) fail3();
      seen.add(key(mark));
      let s;
      try {
        s = JSON.parse(mark.signature);
      } catch {
        fail3();
      }
      if (!exact(s, ["name", "day", "source", "readings"]) || s.name !== mark.name || s.day !== mark.day || typeof s.source !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(s.source) || !Array.isArray(s.readings) || !s.readings.length || s.readings.length > 20) fail3();
      const ids = /* @__PURE__ */ new Set();
      for (const r of s.readings) {
        if (!exact(r, ["id", "offset", "limit", "part", "of"]) || typeof r.id !== "string" || !/^[a-z][a-z0-9.-]{0,299}$/.test(r.id) || ids.has(r.id) || !integer2(r.offset, 0, 1e5) || !(r.limit === null || integer2(r.limit, 1, 1e5)) || !(r.part === null && r.of === null || integer2(r.part, 1, 400) && integer2(r.of, r.part, 400) && r.limit !== null)) fail3();
        ids.add(r.id);
      }
      const signature = JSON.stringify({ name: s.name, day: s.day, source: s.source, readings: s.readings.map((r) => ({ id: r.id, offset: r.offset, limit: r.limit, part: r.part, of: r.of })) });
      return { name: mark.name, day: mark.day, signature };
    });
  }
  function parseProgress(text5, catalog) {
    const progress = parseProgressMetadata(text5), plans2 = new Map(catalog.map((p) => [p.name, p.days]));
    if (progress.some((mark) => !plans2.has(mark.name) || !integer2(mark.day, 1, plans2.get(mark.name)))) throw Error("This is not a supported reading-progress export. No marks were restored.");
    return progress;
  }
  function mergeProgress(existing, incoming) {
    const byKey = new Map(existing.map((x) => [key(x), x])), added = incoming.filter((x) => !byKey.has(key(x))), duplicates = incoming.filter((x) => byKey.get(key(x))?.signature === x.signature).length, conflicts = incoming.length - added.length - duplicates;
    if (existing.length + added.length > MAX_PROGRESS_MARKS) throw Error("These marks exceed the 1,600-mark limit. Export your current progress before changing it. Nothing was restored.");
    return { progress: [...existing, ...added], added: added.length, duplicates, conflicts };
  }

  // web/topics-study.mjs
  var string3 = (x) => typeof x === "string" && x.length > 0;
  var slug = (x) => typeof x === "string" && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(x);
  var integer3 = (x, min = 0, max = 1e5) => Number.isSafeInteger(x) && x >= min && x <= max;
  var fail = () => {
    throw Error("The study index is incomplete or does not match this selection. No topic, list or source was substituted.");
  };
  var array = (x, max) => Array.isArray(x) && x.length <= max;
  var status = (x) => ["canonical", "canonical-later-name", "later"].includes(x);
  var command = (x, tool2, name) => x?.tool === tool2 && x.name === name;
  function atiLink(url) {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && u.hostname === "www.accesstoinsight.org" && !u.username && !u.password && !u.port;
    } catch {
      return false;
    }
  }
  function topicSource(source2) {
    if (!string3(source2?.name) || !string3(source2.license) || !string3(source2.attribution) || !string3(source2.commit)) fail();
  }
  function related(items, tool2) {
    if (items === void 0) return;
    if (!array(items, 500)) fail();
    for (const x of items) if (!slug(x.slug) || !string3(x.name) || !command(x.read_with, tool2, x.slug)) fail();
  }
  function texts(items) {
    if (!array(items, 500)) fail();
    for (const x of items) if (!/^[a-z][a-z0-9.-]*$/.test(x.id || "") || !string3(x.citation) || x.read_with?.tool !== "get_text" || x.read_with.uid !== x.id) fail();
  }
  function topicCatalogue(data, { offset, limit }) {
    topicSource(data?.source);
    if (!integer3(data.total) || data.offset !== offset || !array(data.topics, limit) || data.returned !== data.topics.length || data.returned !== Math.min(limit, Math.max(0, data.total - offset)) || data.next_offset !== (offset + limit < data.total ? offset + limit : null)) fail();
    const seen = /* @__PURE__ */ new Set();
    for (const x of data.topics) {
      if (!slug(x.slug) || seen.has(x.slug) || !string3(x.name) || !["subject", "numerical"].includes(x.index) || !integer3(x.texts) || !command(x.read_with, "topic", x.slug)) fail();
      seen.add(x.slug);
    }
    return data;
  }
  function topicDetail(data, name) {
    topicSource(data?.source);
    if (data.topic?.slug !== name || !slug(name) || !string3(data.topic.name) || !string3(data.topic.index) || !atiLink(data.topic.ati_url) || data.source.url !== data.topic.ati_url || !string3(data.note)) fail();
    texts(data.texts);
    related(data.see_also, "topic");
    related(data.other_matches, "topic");
    if (data.dhamma_list && (!slug(data.dhamma_list.slug) || !string3(data.dhamma_list.name) || !command(data.dhamma_list.read_with, "dhamma_list", data.dhamma_list.slug))) fail();
    if (data.further_reading !== void 0 && (!array(data.further_reading, 500) || data.further_reading.some((x) => !string3(x.title) || !string3(x.kind) || !atiLink(x.url)))) fail();
    for (const x of data.texts) if (!string3(x.ati_reference) || !atiLink(x.ati_url)) fail();
    return data;
  }
  function listCatalogue(data) {
    if (!array(data?.lists, 100) || !data.lists.length) fail();
    const seen = /* @__PURE__ */ new Set();
    for (const x of data.lists) {
      if (!slug(x.slug) || seen.has(x.slug) || !string3(x.name) || !string3(x.pali) || !integer3(x.count, 1, 100) || !status(x.status) || !string3(data.status_labels?.[x.status]) || !command(x.read_with, "dhamma_list", x.slug)) fail();
      seen.add(x.slug);
    }
    return data;
  }
  function listDetail(data, name) {
    if (data?.slug !== name || !slug(name) || !string3(data.name) || !string3(data.pali) || !status(data.status) || !string3(data.status_meaning) || !string3(data.gloss_note) || !string3(data.note) || !integer3(data.count, 1, 100) || !array(data.members, 100) || !data.members.length || !string3(data.source?.curated_by) || !string3(data.source.pali?.name) || !string3(data.source.pali.commit) || !string3(data.source.pali.attribution) || !string3(data.source.pali.terms)) fail();
    for (const [i, x] of data.members.entries()) {
      if (x.n !== i + 1 || !string3(x.pali) || !string3(x.gloss) || x.list !== void 0 && (!slug(x.list) || !command(x.read_with, "dhamma_list", x.list))) fail();
    }
    texts(data.defined_in);
    if (!data.defined_in.length) fail();
    texts(data.see_also_texts || []);
    related(data.related_lists, "dhamma_list");
    if (data.topic && (!slug(data.topic.slug) || !string3(data.topic.name) || !command(data.topic.read_with, "topic", data.topic.slug))) fail();
    return data;
  }

  // web/request-lifecycle.mjs
  var REQUEST_TIMEOUT_MS = 18e4;
  function stopped(reason) {
    const error = new Error(reason === "deadline" ? "The request timed out. Try again; no replacement passage was selected." : reason === "user" ? "Stopped waiting in this browser. The server may still finish; no replacement passage was selected." : "This request was superseded by your new selection.");
    error.code = reason === "deadline" ? "REQUEST_DEADLINE" : reason === "user" ? "REQUEST_STOPPED" : "REQUEST_SUPERSEDED";
    return error;
  }
  function createRequestPool({ onChange = () => {
  }, timeoutMs = REQUEST_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    const pending = /* @__PURE__ */ new Map();
    let serial2 = 0;
    const emit = () => onChange([...pending.values()].map((x) => ({ id: x.id, group: x.group, label: x.label, stop: () => x.cancel("user") })));
    return {
      get size() {
        return pending.size;
      },
      cancelAll(reason = "navigation") {
        for (const x of [...pending.values()]) x.cancel(reason);
      },
      cancelGroup(group, reason = "superseded") {
        for (const x of [...pending.values()]) if (x.group === group) x.cancel(reason);
      },
      async run(task, { group = "page", label = "Reading request" } = {}) {
        const controller = new AbortController();
        let active = true, reason, rejectStop;
        const stop = new Promise((_, reject) => {
          rejectStop = reject;
        });
        const entry = { id: ++serial2, group, label, cancel(why) {
          if (!active) return false;
          active = false;
          reason = why;
          rejectStop(stopped(why));
          controller.abort();
          pending.delete(entry.id);
          emit();
          return true;
        } };
        const timer = setTimer(() => entry.cancel("deadline"), timeoutMs);
        pending.set(entry.id, entry);
        emit();
        try {
          return await Promise.race([Promise.resolve().then(() => {
            if (!active) throw stopped(reason);
            return task(controller.signal);
          }), stop]);
        } finally {
          active = false;
          clearTimer(timer);
          if (pending.delete(entry.id)) emit();
        }
      }
    };
  }

  // web/local-storage-write.mjs
  var own2 = (x, k) => Object.hasOwn(x, k);
  function profile(raw) {
    const x = raw === null ? {} : JSON.parse(raw);
    if (!x || typeof x !== "object" || Array.isArray(x)) throw Error("Unsupported browser data");
    return x;
  }
  function conflict() {
    const e = Error("Another tab changed browser data. No stored data was overwritten.");
    e.code = "BROWSER_DATA_CHANGED";
    return e;
  }
  function withoutPosition(x) {
    const { last, ...rest } = x;
    return JSON.stringify(rest);
  }
  var pointerOK = (x) => !own2(x, "last") || isReadingLocator(x.last);
  function readingPointerOnlyChange(expected, actual) {
    try {
      if (!(expected === null || typeof expected === "string") || !(actual === null || typeof actual === "string")) return false;
      const a = profile(expected), b = profile(actual);
      return pointerOK(a) && pointerOK(b) && withoutPosition(a) === withoutPosition(b);
    } catch {
      return false;
    }
  }
  function guardedStorageWrite({ expected, value, read: read2, write }) {
    const actual = read2();
    if (typeof value !== "string") throw Error("Browser data could not be serialized.");
    let committed = value;
    if (!(expected === null || typeof expected === "string") || actual !== expected) {
      if (!readingPointerOnlyChange(expected, actual)) throw conflict();
      const base = profile(expected), current = profile(actual), incoming = profile(value);
      if (!pointerOK(incoming)) throw conflict();
      if (own2(base, "last") === own2(incoming, "last") && base.last === incoming.last) {
        if (own2(current, "last")) incoming.last = current.last;
        else delete incoming.last;
      }
      committed = JSON.stringify(incoming);
    }
    if (read2() !== actual) throw conflict();
    write(committed);
    return committed;
  }
  function guardedPositionWrite({ expected, locator, read: read2, write }) {
    if (!isReadingLocator(locator)) throw Error("Unsupported reading locator");
    const actual = read2(), current = profile(actual), baseline = profile(expected);
    if (!pointerOK(current) || !pointerOK(baseline)) throw conflict();
    if (current.remember_position === false) {
      baseline.remember_position = false;
      delete baseline.last;
      return { snapshot: JSON.stringify(baseline), disabled: true };
    }
    const committed = JSON.stringify({ ...current, last: locator }), snapshot = JSON.stringify({ ...baseline, last: locator });
    if (read2() !== actual) throw conflict();
    write(committed);
    return { snapshot, disabled: false };
  }

  // web/english-catalogue.mjs
  var ENGLISH_AVAILABILITY = Object.freeze({ linked: "All English links", whole: "Whole-unit or chapter links", scoped: "Scoped English only", none: "No English links" });
  var fail2 = () => {
    throw Error("The English source catalogue does not match this selection. No filter or source was substituted.");
  };
  var object3 = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  var text3 = (x) => typeof x === "string" && x.trim().length > 0 && x.length <= 2e3;
  var count = (x) => Number.isSafeInteger(x) && x >= 0;
  var id = (x) => typeof x === "string" && /^[a-z][a-z0-9.-]{0,199}$/.test(x);
  var collectionId = (x) => typeof x === "string" && /^[a-z]{1,30}$/.test(x);
  var belongs = (uid2, collection) => collection === "vinaya" ? uid2.startsWith("pli-tv-") : collection === "ap" ? /^(tha|thi)-ap[0-9]/.test(uid2) : new RegExp("^" + collection + "[0-9]").test(uid2);
  function englishBrowseCandidate(args) {
    const normalized = (x) => String(x).normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/gu, "").toLowerCase();
    return args.has("availability") || args.has("collection") || args.getAll("node").some((value) => normalized(value) === "english");
  }
  function englishSelection(args) {
    const keys2 = ["node", "availability", "collection", "offset"];
    for (const k of args.keys()) if (!keys2.includes(k) || args.getAll(k).length !== 1) fail2();
    if (args.get("node") !== "english") fail2();
    const availability = args.has("availability") ? args.get("availability") : "linked";
    const collection = args.has("collection") ? args.get("collection") : null;
    const raw = args.has("offset") ? args.get("offset") : "0";
    if (!Object.hasOwn(ENGLISH_AVAILABILITY, availability) || collection !== null && !collectionId(collection) || !/^(0|[1-9]\d*)$/.test(raw) || !count(Number(raw))) fail2();
    return { availability, collection, offset: Number(raw), limit: 40 };
  }
  function englishRoute(selection, offset = selection.offset) {
    if (!Object.hasOwn(ENGLISH_AVAILABILITY, selection.availability) || selection.collection !== null && !collectionId(selection.collection) || !count(offset)) fail2();
    const q = new URLSearchParams({ node: "english", availability: selection.availability });
    if (selection.collection !== null) q.set("collection", selection.collection);
    if (offset) q.set("offset", String(offset));
    return "#browse?" + q;
  }
  function englishBadges(item) {
    const partial = item.partial_english_available || 0, shared = item.shared_english_available || 0;
    return [...item.english_available ? ["Whole-unit or chapter link"] : [], ...partial && shared ? ["Partial and shared sources \xB7 review required"] : partial ? ["Partial source \xB7 review required"] : shared ? ["Shared page \xB7 review required"] : [], ...!item.english_available && !partial && !shared ? ["No indexed English link"] : []];
  }
  function englishCatalogue(data, selection) {
    if (!object3(data) || data.catalogue !== true || data.node !== "english" || data.name !== "Find English sources" || data.availability !== selection.availability || data.collection !== selection.collection || data.offset !== selection.offset || data.limit !== selection.limit || !count(data.total) || !text3(data.note) || !Array.isArray(data.collections) || data.collections.length > 100 || !Array.isArray(data.items) || data.items.length > selection.limit) fail2();
    const collections = /* @__PURE__ */ new Set();
    for (const c of data.collections) {
      if (!object3(c) || !collectionId(c.id) || collections.has(c.id) || !text3(c.name)) fail2();
      collections.add(c.id);
    }
    if (!collections.size || selection.collection !== null && !collections.has(selection.collection)) fail2();
    const expected = Math.min(selection.limit, Math.max(0, data.total - selection.offset));
    if (data.items.length !== expected || data.next_offset !== (selection.offset + selection.limit < data.total ? selection.offset + selection.limit : null)) fail2();
    const seen = /* @__PURE__ */ new Set();
    for (const item of data.items) {
      if (!object3(item) || !id(item.id) || seen.has(item.id) || !text3(item.citation) || !text3(item.title) || !text3(item.collection) || !collections.has(item.collection_id) || !belongs(item.id, item.collection_id) || selection.collection !== null && item.collection_id !== selection.collection || item.approximate || item.kind === "range" || !count(item.english_available)) fail2();
      for (const k of ["partial_english_available", "shared_english_available"]) if (Object.hasOwn(item, k) && !count(item[k])) fail2();
      const cmd = item.read_with;
      if (!object3(cmd) || Object.keys(cmd).sort().join(",") !== "tool,uid" || cmd.tool !== "get_text" || cmd.uid !== item.id) fail2();
      const whole = item.english_available > 0, scoped = (item.partial_english_available || 0) + (item.shared_english_available || 0) > 0;
      if (selection.availability === "linked" && !whole && !scoped || selection.availability === "whole" && !whole || selection.availability === "scoped" && (whole || !scoped) || selection.availability === "none" && (whole || scoped)) fail2();
      if (Object.hasOwn(item, "source_context")) {
        const context = item.source_context;
        if (!object3(context) || Object.keys(context).sort().join(",") !== "citation,id,kind,title" || context.kind !== "containing_group" || !id(context.id) || !belongs(context.id, item.collection_id) || context.id === item.id || !text3(context.citation) || !text3(context.title) || !whole) fail2();
      }
      seen.add(item.id);
    }
    return data;
  }

  // web/translation-comparison.mjs
  var object4 = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  var own3 = (x, key3) => Object.hasOwn(x, key3);
  var text4 = (x) => typeof x === "string" && x.trim().length > 0;
  var uid = (x) => typeof x === "string" && x.trim() === x && /^[a-z][a-z0-9.-]{0,199}$/.test(x);
  var sha2 = (x) => typeof x === "string" && /^[0-9a-f]{64}$/.test(x);
  var clone = (x) => JSON.parse(JSON.stringify(x));
  var failure = () => {
    throw Error("The comparison selection or source response is invalid. No comparison translation was displayed.");
  };
  var sourceId = (x) => typeof x === "string" && x.trim() === x && !/[\x00-\x1f\x7f]/.test(x) && x.length <= 200 && !x.includes("..") && !/\.html?$/.test(x) && (/^dt:[A-Za-z0-9_./-]+$/.test(x) || /^ati:\/(?:tipitaka|lib|ptf|noncanon)\/[a-z0-9/._-]+$/.test(x) || /^aj:[A-Za-z0-9_./ -]+$/.test(x) && x.trim() === x);
  function comparisonChoices(choices, requestedId) {
    if (!uid(requestedId) || !Array.isArray(choices)) failure();
    const seen = /* @__PURE__ */ new Set(), ordinary = [];
    for (const choice of choices) {
      if (!object4(choice)) failure();
      if (text4(choice.translation_id)) {
        if (seen.has(choice.translation_id)) failure();
        seen.add(choice.translation_id);
      }
      if ("translation_scope" in choice || choice.whole_unit_coverage === false) continue;
      if (!sourceId(choice.translation_id) || !text4(choice.translator) || choice.translator.length > 300 || own3(choice, "whole_unit_coverage") && choice.whole_unit_coverage !== true) failure();
      ordinary.push(clone(choice));
    }
    return ordinary;
  }
  function comparisonSelection(ids, choices, requestedId) {
    const ordinary = comparisonChoices(choices, requestedId);
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some((id2) => !sourceId(id2) || !ordinary.some((choice) => choice.translation_id === id2))) failure();
    return [...ids];
  }
  var requestKeys = /* @__PURE__ */ new Set(["uid", "translation", "offset", "limit", "prefix_sha256"]);
  function request(args, requestedId, choice, expectedLimit) {
    if (!object4(args) || Object.keys(args).some((key3) => !requestKeys.has(key3)) || args.uid !== requestedId || args.translation !== choice.translation_id || !sourceId(args.translation) || !Number.isSafeInteger(args.limit) || args.limit < 500 || args.limit > 3e4 || expectedLimit !== void 0 && args.limit !== expectedLimit) failure();
    const offset = own3(args, "offset") ? args.offset : 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2e6 || offset === 0 && own3(args, "prefix_sha256") || offset > 0 && !sha2(args.prefix_sha256)) failure();
    return offset;
  }
  function validateComparisonPage(data, args, context) {
    if (!object4(context) || !uid(context.uid) || context.accepted != null) failure();
    const ordinary = comparisonChoices(context.choices, context.uid);
    const choice = ordinary.find((choice2) => choice2.translation_id === args?.translation);
    if (!choice) failure();
    const offset = request(args, context.uid, choice);
    if (!object4(data) || data.translation_id !== args.translation) throw Error("A different English source was returned for this comparison column. No translation was displayed.");
    if (data.translator !== choice.translator || data.limit !== args.limit || !sha2(data.prefix_sha256) || offset > 0 && data.prefix_sha256 !== args.prefix_sha256 || "translation_scope" in data || data.whole_unit_coverage === false || typeof data.text !== "string" || data.text.length > args.limit || offset + data.text.length > 2e6 || !own3(data, "next_offset") || data.next_offset !== null && !Number.isSafeInteger(data.next_offset)) failure();
    const next = validateEnglishPage(data, args, { uid: context.uid, choices: [choice], accepted: null });
    if (next === null) return null;
    if (!object4(data.continue_with) || Object.keys(data.continue_with).sort().join(",") !== "arguments,name") failure();
    const nextOffset = request(next, context.uid, choice, args.limit);
    if (data.text.length !== args.limit || nextOffset !== offset + data.text.length) failure();
    return clone(next);
  }

  // web/passage-notes.mjs
  var own4 = (value, key3) => Object.hasOwn(value, key3);
  var object5 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  var position = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1e5;
  var revision = (value) => typeof value === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(value);
  function clone2(value, depth = 0) {
    if (depth > 32) throw Error("Personal-note metadata is nested too deeply. Keep/export it before repairing it.");
    if (value instanceof Map) return new Map([...value].map(([key3, item]) => [clone2(key3, depth + 1), clone2(item, depth + 1)]));
    if (Array.isArray(value)) return value.map((item) => clone2(item, depth + 1));
    if (object5(value)) return Object.fromEntries(Object.entries(value).map(([key3, item]) => [key3, clone2(item, depth + 1)]));
    return value;
  }
  var noteText = (value) => {
    if (typeof value !== "string" || value.length > 4e3) throw Error("Personal notes must be text of at most 4,000 characters.");
    return value;
  };
  function bookmarkShape(item) {
    parseBookmarks(JSON.stringify({ format: "pali-library-v1", saved: [item] }));
    if (own4(item, "offset") && !position(item.offset)) throw Error("This bookmark has invalid saved-position metadata.");
    if (own4(item, "source_commit") && (!revision(item.source_commit) || !position(item.offset))) throw Error("This bookmark has invalid saved revision or position metadata.");
  }
  function currentContext(context) {
    if (!object5(context) || Object.keys(context).some((key3) => !["uid", "ref", "title", "offset", "source_commit"].includes(key3))) throw Error("This passage has unsupported personal-note reference metadata.");
    bookmarkShape({ ...context, note: "" });
    if (!position(context.offset) || !revision(context.source_commit)) throw Error("This passage has no valid current position and source revision.");
  }
  function passageNoteKey(item) {
    if (!object5(item) || typeof item.uid !== "string" || !item.uid || typeof item.ref !== "string" || !item.ref) throw Error("A personal note needs an exact source selector and passage reference.");
    return JSON.stringify([item.uid, item.ref]);
  }
  function passageNoteState(saved2, context) {
    if (!Array.isArray(saved2)) throw Error("Saved passages must be an array.");
    let key3, item = null;
    try {
      currentContext(context);
      key3 = passageNoteKey(context);
      const matches = saved2.filter((value) => object5(value) && value.uid === context.uid && value.ref === context.ref);
      if (matches.length > 1) throw Error("Duplicate saved references need review in Saved before editing a note here.");
      item = matches[0] ?? null;
      if (item) bookmarkShape(item);
      if (item && own4(item, "source_commit") && item.source_commit !== context.source_commit) throw Error("The saved source revision differs. Review or edit this personal note in Saved; it was not associated with the current passage.");
      const legacy = Boolean(item && !own4(item, "source_commit"));
      return { eligible: true, reason: null, warning: legacy ? "Unversioned bookmark: no source revision was saved. Check the reference before using this personal note; editing leaves it unversioned." : null, legacy, item: clone2(item), key: key3 };
    } catch (error) {
      return { eligible: false, reason: error.message, warning: null, legacy: false, item: null, key: key3 ?? null };
    }
  }
  function createPassageBookmark(context) {
    currentContext(context);
    return { uid: context.uid, ref: context.ref, title: context.title, note: "", offset: context.offset, source_commit: context.source_commit };
  }
  function passageNoteRemovalNeedsConfirmation(item, drafts) {
    if (!(drafts instanceof Map)) throw Error("Personal-note drafts must be a Map.");
    const key3 = passageNoteKey(item);
    const stored = item.note === void 0 ? "" : noteText(item.note);
    const draft = drafts.has(key3) ? noteText(drafts.get(key3)) : "";
    return stored.length > 0 || draft.length > 0;
  }
  function passageNoteTransaction(saved2, drafts, context, operation) {
    if (!(drafts instanceof Map) || !object5(operation) || Object.keys(operation).some((key4) => !["type", "note", "confirmed", "mode"].includes(key4)) || !["ensure", "save", "remove"].includes(operation.type) || own4(operation, "mode") && !["reading", "saved"].includes(operation.mode)) throw Error("Unsupported personal-note change.");
    let state;
    if (operation.mode === "saved") {
      if (!Array.isArray(saved2) || !object5(context) || Object.keys(context).some((key4) => !["uid", "ref"].includes(key4)) || operation.type === "ensure") throw Error("Saved note edits require an exact existing bookmark identity.");
      parseBookmarks(JSON.stringify({ format: "pali-library-v1", saved: [{ ...context, title: "Personal bookmark", note: "" }] }));
      const matches = saved2.filter((item) => object5(item) && item.uid === context.uid && item.ref === context.ref);
      if (matches.length !== 1) throw Error("Saved note edits require one exact existing bookmark.");
      state = { eligible: true, key: passageNoteKey(context), item: clone2(matches[0]) };
    } else state = passageNoteState(saved2, context);
    if (!state.eligible) throw Error(state.reason);
    const { key: key3 } = state;
    if (drafts.has(key3)) noteText(drafts.get(key3));
    if (operation.type !== "save" && own4(operation, "note")) throw Error("Only saving a personal note accepts note text.");
    if (own4(operation, "confirmed") && typeof operation.confirmed !== "boolean") throw Error("Removal confirmation must be explicit.");
    const note = operation.type === "save" ? noteText(operation.note) : void 0;
    if (operation.type === "remove" && !state.item) throw Error("This exact passage is not saved.");
    if (operation.type === "remove" && passageNoteRemovalNeedsConfirmation(state.item, drafts) && operation.confirmed !== true) {
      const error = Error("Confirm removal of this bookmark and its personal note first.");
      error.code = "NOTE_CONFIRMATION_REQUIRED";
      throw error;
    }
    if (!state.item && saved2.length >= 500) throw Error("Your saved list is full (500 passages). Export or remove passages before adding a note.");
    const before = { saved: clone2(saved2), drafts: clone2(drafts) };
    if (operation.type === "save") before.drafts.set(key3, note);
    const result = { saved: clone2(saved2), drafts: clone2(drafts), before, item: null, removed: operation.type === "remove" };
    const index = result.saved.findIndex((item) => object5(item) && item.uid === context.uid && item.ref === context.ref);
    if (operation.type === "remove") result.saved.splice(index, 1);
    else {
      const item = state.item ?? createPassageBookmark(context);
      if (operation.type === "save") item.note = note;
      if (index < 0) result.saved.push(item);
      else result.saved[index] = item;
      result.item = clone2(item);
    }
    if (operation.type !== "ensure") result.drafts.delete(key3);
    return result;
  }
  function restorePassageNoteTransaction(transaction) {
    if (!object5(transaction?.before) || !Array.isArray(transaction.before.saved) || !(transaction.before.drafts instanceof Map)) throw Error("No personal-note transaction snapshot is available.");
    return clone2(transaction.before);
  }

  // web/reading-navigation.mjs
  var integer4 = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  var pageKeys = /* @__PURE__ */ new Set(["uid", "book", "kind", "plan", "day", "offset", "page_source"]);
  function revision2(value) {
    if (typeof value !== "string" || sourceRevision({ source: { commit: value } }) !== value) throw Error("This page has no valid source revision.");
    return value;
  }
  var invalid = () => {
    throw Error("This source page has incomplete or unsupported navigation metadata. No passage was substituted.");
  };
  function readingPagePosition(context, offset, source2) {
    assertReadingContext(context);
    if (!integer4(offset, 0, 1e5)) invalid();
    revision2(source2);
    return "#read?" + new URLSearchParams({ ...context, offset, page_source: source2 });
  }
  function assertPageRequest(args) {
    if (!args.has("page_source")) return;
    const keys2 = [...args.keys()];
    if (keys2.some((key3) => !pageKeys.has(key3)) || new Set(keys2).size !== keys2.length || args.getAll("page_source").length !== 1 || args.getAll("offset").length !== 1 || !/^(0|[1-9][0-9]*)$/.test(args.get("offset") || "") || !integer4(Number(args.get("offset")), 0, 1e5)) invalid();
    revision2(args.get("page_source"));
    const context = Object.fromEntries(["uid", "book", "kind", "plan"].filter((key3) => args.has(key3)).map((key3) => [key3, args.get(key3)]));
    if (args.has("day")) {
      if (!/^[1-9][0-9]*$/.test(args.get("day") || "")) invalid();
      context.day = Number(args.get("day"));
    }
    assertReadingContext(context);
  }
  function assertPagePin(args, data) {
    if (!args.has("page_source")) return;
    assertPageRequest(args);
    if (sourceRevision(data) !== args.get("page_source")) {
      const error = Error("The source or citation mapping revision changed since this page link was opened. Review the current source explicitly before continuing; no replacement wording was displayed.");
      error.code = "READING_SOURCE_CHANGED";
      throw error;
    }
    readingPageBounds(data);
    if (data.offset !== Number(args.get("offset"))) invalid();
  }
  function readingPageBounds(data, window2 = null) {
    if (!data || !integer4(data.total_segments, 1, 100001) || !integer4(data.offset, 0, 1e5) || !integer4(data.returned, 1, 100001) || data.offset + data.returned > data.total_segments || !Array.isArray(data.segments) || data.segments.length !== data.returned || data.next_offset !== (data.offset + data.returned < data.total_segments ? data.offset + data.returned : null)) invalid();
    let start = 0, end = data.total_segments;
    if (window2 !== null) {
      if (!window2 || !integer4(window2.start, 0, 1e5) || !(window2.end === null || integer4(window2.end, 1, 100001)) || !integer4(window2.offset, 0, 1e5) || !integer4(window2.limit, 1, 1e5) || window2.offset !== data.offset || data.returned > window2.limit) invalid();
      start = window2.start;
      end = window2.end === null ? data.total_segments : window2.end;
    }
    if (start >= end || end > data.total_segments || data.offset < start || data.offset + data.returned > end) invalid();
    return { start, end, current: data.offset };
  }
  function readingJumpOffset(text5, data, window2 = null) {
    if (typeof text5 !== "string" || !/^[1-9][0-9]*$/.test(text5)) throw Error("Enter a source position using whole decimal digits only.");
    const position2 = Number(text5), bounds = readingPageBounds(data, window2);
    if (!integer4(position2, 1, 100001) || position2 - 1 < bounds.start || position2 - 1 >= bounds.end) throw Error("That source position is outside the current reading bounds.");
    return position2 - 1;
  }

  // web/saved-highlights.mjs
  function savedPassageHighlighted(saved2, context, enabled = true) {
    if (enabled === false) return false;
    try {
      const state = passageNoteState(saved2, context);
      return Boolean(state.eligible && !state.legacy && state.item && Object.hasOwn(state.item, "source_commit") && state.item.source_commit === context.source_commit && Object.hasOwn(state.item, "offset") && state.item.offset === context.offset);
    } catch {
      return false;
    }
  }

  // web/study-backup.mjs
  var MAX_STUDY_BACKUP_BYTES = 32 * 1024 * 1024;
  var FORMAT = "pali-library-study-backup-v1";
  var object6 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  var exact2 = (value, keys2) => object6(value) && Object.keys(value).length === keys2.length && keys2.every((key3) => Object.hasOwn(value, key3));
  var bytes = (text5) => new TextEncoder().encode(text5).length;
  var clone3 = (value) => JSON.parse(JSON.stringify(value));
  var key2 = (item) => JSON.stringify([item.uid, item.ref]);
  function jsonData(value, depth = 0) {
    if (depth > 12) throw Error("Unsupported nested study-backup metadata. Nothing was restored.");
    if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return;
    if (Array.isArray(value)) {
      for (const item of value) jsonData(item, depth + 1);
      return;
    }
    if (object6(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      for (const item of Object.values(value)) jsonData(item, depth + 1);
      return;
    }
    throw Error("Study backups accept only supported JSON metadata. Nothing was restored.");
  }
  function component(value, format, field, max) {
    const text5 = JSON.stringify({ format, [field]: value });
    if (bytes(text5) > max) throw Error("A study-backup component exceeds the 16 MiB limit. Nothing was restored.");
    return text5;
  }
  function validate(data, canonicalizeProgress) {
    if (!exact2(data, ["format", "saved", "progress", "resume"]) || data.format !== FORMAT || !Array.isArray(data.saved) || !Array.isArray(data.progress) || !(data.resume === null || isReadingLocator(data.resume))) throw Error("This is not a supported study backup. Nothing was restored.");
    jsonData(data);
    if (bytes(JSON.stringify(data)) > MAX_STUDY_BACKUP_BYTES) throw Error("Choose a study backup no larger than 32 MiB. Nothing was restored.");
    const saved2 = parseBookmarks(component(data.saved, "pali-library-v1", "saved", MAX_IMPORT_BYTES));
    const normalized = parseProgressMetadata(component(data.progress, "pali-library-reading-progress-v1", "progress", MAX_PROGRESS_BYTES));
    return { format: FORMAT, saved: saved2, progress: canonicalizeProgress ? normalized : clone3(data.progress), resume: data.resume };
  }
  function createStudyBackup(data) {
    if (!exact2(data, ["saved", "progress", "resume"])) throw Error("Choose only saved passages, progress and an optional reading locator for backup.");
    return validate({ format: FORMAT, ...data }, false);
  }
  function parseStudyBackup(text5) {
    if (typeof text5 !== "string" || bytes(text5) > MAX_STUDY_BACKUP_BYTES) throw Error("Choose a study backup no larger than 32 MiB. Nothing was restored.");
    let data;
    try {
      data = JSON.parse(text5);
    } catch {
      throw Error("Choose a valid JSON study backup. Nothing was restored.");
    }
    return validate(data, true);
  }
  function mergeStudyBackup(current, incoming, catalog) {
    if (!object6(current) || Object.keys(current).some((field) => !["saved", "progress", "drafts"].includes(field)) || !Array.isArray(current.saved) || !Array.isArray(current.progress) || current.drafts !== void 0 && !(current.drafts instanceof Map)) throw Error("Unsupported current personal-study metadata. Nothing was restored.");
    const validatedCurrent = createStudyBackup({ saved: current.saved, progress: current.progress, resume: null });
    const validatedIncoming = validate(incoming, true);
    let progress = validatedIncoming.progress;
    if (progress.length) {
      if (!Array.isArray(catalog) || !catalog.length) throw Error("Current reading-plan metadata is required before restoring marks. Nothing was restored.");
      progress = parseProgress(component(progress, "pali-library-reading-progress-v1", "progress", MAX_PROGRESS_BYTES), catalog);
    }
    const effective = validatedCurrent.saved.map((item) => {
      if (!current.drafts?.has(key2(item))) return item;
      const note = current.drafts.get(key2(item));
      if (typeof note !== "string" || note.length > 4e3) throw Error("A current personal-note draft exceeds the supported note format. Nothing was restored.");
      return { ...item, note };
    });
    const bookmarks = bookmarkMerge(current.saved, validatedIncoming.saved), marks = mergeProgress(current.progress, progress);
    const existing = new Map(effective.map((item) => [key2(item), item]));
    let bookmarkDuplicates = 0, bookmarkConflicts = 0;
    for (const item of validatedIncoming.saved) {
      const prior = existing.get(key2(item));
      if (prior) {
        if (JSON.stringify(prior) === JSON.stringify(item)) bookmarkDuplicates++;
        else bookmarkConflicts++;
      }
    }
    return { saved: clone3(bookmarks.saved), progress: clone3(marks.progress), bookmarkAdded: bookmarks.added.length, bookmarkDuplicates, bookmarkConflicts, progressAdded: marks.added, progressDuplicates: marks.duplicates, progressConflicts: marks.conflicts };
  }

  // web/reader.js
  var $ = (id2) => document.getElementById(id2);
  var view = $("view");
  var status2 = $("status");
  var serial = 0;
  var epoch = 0;
  var studyEpoch = 0;
  var positionTimer;
  var activePosition = null;
  var KEY = "pali-library-v1";
  var storageOK = true;
  var storageSnapshot;
  var positionDurable = true;
  var positionWarning = "";
  var storageConflict = false;
  var storageReadFailed = false;
  var noteDrafts = /* @__PURE__ */ new Map();
  var noteKey = passageNoteKey;
  var highlightTargets = [];
  function refreshPersonalHighlights() {
    highlightTargets = highlightTargets.filter((target) => target.token === epoch && target.node.isConnected);
    for (const target of highlightTargets) target.node.classList.toggle("personal-highlight", savedPassageHighlighted(local.saved, target.context, local.highlight_saved !== false));
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      storageSnapshot = raw;
      const x = JSON.parse(raw || "{}");
      if (!x || typeof x !== "object" || Array.isArray(x)) throw Error("Unsupported browser data");
      return x;
    } catch {
      storageOK = false;
      storageReadFailed = true;
      return {};
    }
  }
  var local = loadLocal();
  local.reading_progress = cleanProgress(local.reading_progress);
  if (!Array.isArray(local.saved)) local.saved = [];
  local.saved = local.saved.filter((x) => x && typeof x.uid === "string" && typeof x.ref === "string" && typeof x.title === "string").slice(0, 500);
  function storageWarning() {
    return storageConflict ? "Another tab changed browser data. Changes are kept in this tab only; no saved data was overwritten. Export reading progress and bookmarks/notes before reloading." : "Browser storage is unavailable. Changes are kept in this tab only. Export reading progress and bookmarks/notes before closing.";
  }
  function exportBookmarks() {
    return { format: KEY, saved: local.saved.map((item) => {
      return noteDrafts.has(noteKey(item)) ? { ...item, note: noteDrafts.get(noteKey(item)) } : item;
    }) };
  }
  function showStorageRecovery() {
    const panel = $("storage-recovery");
    if (!panel.hidden) {
      panel.querySelector("p").textContent = storageWarning();
      return;
    }
    panel.hidden = false;
    panel.replaceChildren(el("h2", "Keep this tab\u2019s changes"), el("p", storageWarning()), el("p", "Recovery files include this tab\u2019s unsaved note edits. Existing saved data is kept. After reloading, compare conflicting notes manually; import keeps existing notes on duplicate passages.", "muted"));
    const actions = el("div", void 0, "toolbar");
    actions.append(button("Download study backup", downloadStudyBackup), button("Download this tab\u2019s bookmarks and notes", () => exportPersonal(exportBookmarks(), "pali-library-bookmarks.json")), button("Download this tab\u2019s reading progress", () => exportPersonal({ format: "pali-library-reading-progress-v1", progress: local.reading_progress }, "pali-library-reading-progress.json")));
    const review = el("div");
    actions.append(button("Review reload options", () => {
      const title = el("h3", "Export before reloading");
      title.tabIndex = -1;
      review.replaceChildren(title, el("p", "Reloading replaces changes kept only in this tab with stored browser data. Download both recovery files first.", "notice"), button("Cancel reload", () => {
        review.replaceChildren();
        actions.querySelector("button:last-child").focus();
      }), button("Reload stored browser data", () => location.reload()));
      title.focus();
    }));
    panel.append(actions, review);
  }
  function persist() {
    try {
      if (storageConflict || storageReadFailed) {
        showStorageRecovery();
        status2.textContent = storageWarning();
        return false;
      }
      const serialized = JSON.stringify(local);
      storageSnapshot = guardedStorageWrite({ expected: storageSnapshot, value: serialized, read: () => localStorage.getItem(KEY), write: (value) => localStorage.setItem(KEY, value) });
      if (storageSnapshot !== serialized) {
        const saved2 = JSON.parse(storageSnapshot);
        if (Object.hasOwn(saved2, "last")) local.last = saved2.last;
        else delete local.last;
        updateResume();
      }
      positionWarning = "";
      storageOK = true;
      positionDurable = true;
      $("storage-recovery").hidden = true;
      return true;
    } catch (error) {
      if (error.code === "BROWSER_DATA_CHANGED") storageConflict = true;
      else storageOK = false;
      showStorageRecovery();
      status2.textContent = storageWarning();
      return false;
    }
  }
  function el(tag, text5, className) {
    const n = document.createElement(tag);
    if (text5 !== void 0) n.textContent = text5;
    if (className) n.className = className;
    return n;
  }
  function button(text5, fn) {
    const n = el("button", text5);
    n.type = "button";
    n.addEventListener("click", fn);
    return n;
  }
  function link(text5, href, className) {
    const n = el("a", text5, className);
    n.href = href;
    return n;
  }
  function external(text5, url) {
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return el("span", text5);
      return link(text5, u.href);
    } catch {
      return el("span", text5);
    }
  }
  function route(name, args = {}) {
    return "#" + name + "?" + new URLSearchParams(args);
  }
  var requestLabels = { get_text: "P\u0101li reading", get_translation: "English source", browse_canon: "Library", get_commentary: "Commentary", get_post_canonical: "Later P\u0101li reading", reading_plan: "Reading plan", search_texts: "Text search", search_commentary: "Commentary search", search_post_canonical: "Later-work search", glossary: "Glossary", analyse_passage: "Word study", get_parallels: "Related texts", daily_text: "Daily reading", verify_quote: "Quotation check", list_topics: "Topic index", topic: "Topic detail", dhamma_list: "Teaching list" };
  var requestRows = /* @__PURE__ */ new Map();
  var requests = createRequestPool({ onChange(entries) {
    const active = new Set(entries.map((x) => x.id));
    for (const [id2, row] of requestRows) if (!active.has(id2)) {
      if (row.contains(document.activeElement)) (row.dataset.group === "study" ? $("study") || $("content") : $("content")).focus({ preventScroll: true });
      row.remove();
      requestRows.delete(id2);
    }
    for (const entry of entries) if (!requestRows.has(entry.id)) {
      const row = el("div", void 0, "request-row"), stop = button("Stop waiting", entry.stop);
      row.dataset.group = entry.group;
      stop.setAttribute("aria-label", "Stop waiting for " + entry.label);
      row.append(el("span", "Waiting for " + entry.label + "\u2026"), stop);
      $("request-controls").append(row);
      requestRows.set(entry.id, row);
    }
    $("pending-requests").hidden = entries.length === 0;
  } });
  async function tool(name, args, group = "page", requestLabel = requestLabels[name] || "Reading request") {
    return requests.run(async (signal) => {
      const response = await fetch("/mcp", { method: "POST", signal, headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++serial, method: "tools/call", params: { name, arguments: args } }) });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many requests. Wait a minute, then try again." : "The text service is unavailable. Try again.");
      const rpc = await response.json();
      if (rpc.error) throw new Error(rpc.error.message);
      const result = rpc.result;
      if (!result) throw new Error("The text service returned an incomplete response.");
      const data = result.structuredContent || JSON.parse(result.content?.find((c) => c.type === "text")?.text || "{}");
      if (result.isError || data.error) throw new Error(data.error || "This selection could not be retrieved.");
      return data;
    }, { group, label: requestLabel });
  }
  function notes(data, target = view) {
    const list = [...data.notes || [], ...data.approximate ? ["This source selection is approximate or abbreviated. Missing text has not been reconstructed."] : []];
    if (data.alignment_note) list.push(data.alignment_note);
    if (data.alignment_method) list.push(data.alignment_method);
    if (data.input_romanized) list.push("Input converted from " + data.input_script + " to Roman P\u0101li: " + data.input_romanized);
    if (data.input_normalised) list.push(typeof data.input_normalised === "string" ? data.input_normalised : data.input_normalised.note || JSON.stringify(data.input_normalised));
    if (data.canonical === false && data.label) list.unshift(data.label);
    if (data.alignment) list.push(typeof data.alignment === "string" ? data.alignment : JSON.stringify(data.alignment));
    if (list.length) target.append(el("div", [...new Set(list)].join("\n"), "notice"));
  }
  function provenance(data, target = view) {
    const box = el("section", void 0, "provenance");
    box.setAttribute("aria-label", "Source attribution");
    box.append(el("strong", data.edition || data.dictionary?.name || data.source?.name || (typeof data.source === "string" ? data.source : null) || data.label || "Source provenance"));
    const license = data.license || data.source?.terms;
    const values = [data.attribution || data.source?.attribution, typeof license === "string" ? license : license && [license.name, license.note, license.attribution].filter(Boolean).join(" \xB7 "), data.dictionary?.version && "Dictionary version: " + data.dictionary.version, data.source?.commit && "Source revision: " + data.source.commit];
    for (const value of [...new Set(values.filter(Boolean))]) box.append(el("p", value));
    if (typeof license === "object" && license?.url) box.append(external("Licence terms", license.url));
    if (data.url) box.append(external("Read at the original source", data.url));
    if (data.source?.inputs) {
      const details = el("details");
      details.append(el("summary", "Source-data versions"));
      for (const [name, meta] of Object.entries(data.source.inputs)) details.append(el("p", name + " \xB7 " + (meta.vri_commit || "") + " \xB7 SHA-256 " + (meta.sha256 || "not supplied")));
      box.append(details);
    }
    target.append(box);
  }
  function heading(eyebrow, title, tabTitle = title) {
    view.append(el("p", eyebrow, "eyebrow"), el("h2", title));
    document.title = String(tabTitle).slice(0, 160) + " \xB7 P\u0101li Library";
  }
  var narrowReading = window.matchMedia("(max-width: 760px)");
  function responsivePanels() {
    for (const panel of document.querySelectorAll("#find-panel, .study-actions")) {
      const summary = panel.querySelector(":scope > summary"), active = document.activeElement;
      panel.open = !narrowReading.matches;
      if (narrowReading.matches && panel.contains(active) && active !== summary) summary.focus({ preventScroll: true });
      else if (!narrowReading.matches && active === summary) panel.querySelector("input, button, a, select")?.focus({ preventScroll: true });
    }
  }
  function closeFinder() {
    if (narrowReading.matches) {
      const panel = $("find-panel"), focused = panel.contains(document.activeElement);
      panel.open = false;
      if (focused) $("content").focus({ preventScroll: true });
    }
  }
  function navigateFromFinder(target) {
    closeFinder();
    $("content").focus({ preventScroll: true });
    if (location.hash === target) render();
    else location.hash = target;
  }
  if (narrowReading.addEventListener) narrowReading.addEventListener("change", responsivePanels);
  else narrowReading.addListener(responsivePanels);
  responsivePanels();
  function focusHeading() {
    $("content").focus({ preventScroll: true });
  }
  function updateResume() {
    const valid = local.remember_position !== false && typeof local.last === "string" && /^#read\?/.test(local.last);
    $("resume").hidden = !valid || location.hash === local.last || activePosition?.token === epoch && activePosition.links.some((x) => x.href === local.last);
    if (valid) $("resume").href = local.last;
  }
  function rememberPosition(href) {
    if (local.remember_position === false || !href || local.last === href) return;
    local.last = href;
    updateResume();
    if (storageReadFailed) {
      positionDurable = false;
      showStorageRecovery();
      status2.textContent = storageWarning();
      return;
    }
    try {
      const result = guardedPositionWrite({ expected: storageSnapshot, locator: href, read: () => localStorage.getItem(KEY), write: (value) => localStorage.setItem(KEY, value) });
      storageSnapshot = result.snapshot;
      if (result.disabled) {
        local.remember_position = false;
        delete local.last;
        $("remember-position").checked = false;
        updateResume();
      }
      positionDurable = true;
      positionWarning = "";
    } catch (error) {
      positionDurable = false;
      if (error.code === "BROWSER_DATA_CHANGED") positionWarning = "Reading position is kept in this tab only because browser data changed while saving. No notes were replaced.";
      else {
        storageOK = false;
        showStorageRecovery();
      }
      status2.textContent = positionWarning || storageWarning();
    }
  }
  function visibleReadingPosition() {
    if (activePosition?.token !== epoch) return;
    return activePosition.links.find((x) => {
      const rect = x.node.getBoundingClientRect();
      return rect.bottom > 1 && rect.top < innerHeight;
    });
  }
  function flushReadingPosition() {
    clearTimeout(positionTimer);
    if (local.remember_position === false || activePosition?.token !== epoch) return;
    const visible = visibleReadingPosition();
    if (visible) rememberPosition(visible.href);
  }
  window.addEventListener("scroll", () => {
    clearTimeout(positionTimer);
    if (activePosition?.token === epoch && local.remember_position !== false) positionTimer = setTimeout(flushReadingPosition, 350);
  }, { passive: true });
  window.addEventListener("pagehide", flushReadingPosition);
  function preferences() {
    $("remember-position").checked = local.remember_position !== false;
    $("highlight-saved").checked = local.highlight_saved !== false;
    const size = Math.max(16, Math.min(30, Number(local.font) || 21));
    document.documentElement.style.setProperty("--reading", size + "px");
    $("font-size").value = size;
    document.body.dataset.theme = local.theme === "dark" ? "dark" : "light";
    $("theme").value = document.body.dataset.theme;
    if ([...$("script").options].some((o) => o.value === local.script)) $("script").value = local.script;
  }
  preferences();
  updateResume();
  $("remember-position").addEventListener("change", (e) => {
    local.remember_position = e.target.checked;
    if (!e.target.checked) {
      clearTimeout(positionTimer);
      delete local.last;
    }
    persist();
    if (e.target.checked) flushReadingPosition();
    updateResume();
  });
  $("highlight-saved").addEventListener("change", (e) => {
    local.highlight_saved = e.target.checked;
    persist();
    refreshPersonalHighlights();
  });
  $("font-size").addEventListener("input", (e) => {
    local.font = Number(e.target.value);
    preferences();
    persist();
  });
  $("theme").addEventListener("change", (e) => {
    local.theme = e.target.value;
    preferences();
    persist();
  });
  $("script").addEventListener("change", (e) => {
    local.script = e.target.value;
    persist();
    if (location.hash.startsWith("#read") || location.hash.startsWith("#daily")) render();
  });
  $("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    navigateFromFinder(route("search", { q: $("query").value.trim(), scope: $("search-scope").value }));
  });
  document.querySelector(".skip").addEventListener("click", (e) => {
    e.preventDefault();
    $("content").focus();
  });
  $("reference-form").addEventListener("submit", (e) => {
    e.preventDefault();
    navigateFromFinder(route("read", { uid: $("reference").value.trim() }));
  });
  function pageControls(next, previous, action) {
    const p = el("nav", void 0, "pager");
    p.setAttribute("aria-label", "Pagination");
    if (previous !== null) p.append(link("\u2190 Previous page", action(previous), "button"));
    if (next !== null && next !== void 0) p.append(link("Next page \u2192", action(next), "button"));
    view.append(p);
  }
  async function browse(args, token) {
    if (englishBrowseCandidate(args)) return browseEnglish(args, token);
    const node = args.get("node") || "canon", offset = offsetOf(args), limit = 40;
    const kind = node === "commentary" ? "commentary" : node === "post" ? "post" : "canon";
    const data = kind === "commentary" ? await tool("get_commentary", { uid: "commentary", offset, limit }) : kind === "post" ? await tool("get_post_canonical", { offset, limit }) : await tool("browse_canon", { node, offset, limit });
    if (token !== epoch) return;
    heading("EXPLORE THE LIBRARY", kind === "commentary" ? "Traditional commentary" : kind === "post" ? "Later P\u0101li works" : data.name || "The P\u0101li Canon");
    const nav = el("div", void 0, "toolbar");
    nav.append(link("All collections", route("browse", { node: "canon" }), "button"), link("Complete source books", route("browse", { node: "books" }), "button"), link("Find English sources", "#browse?node=english", "button"));
    if (node === "canon") nav.append(link("Study by topic", "#topics", "button"), link("Numbered teaching lists", "#lists", "button"));
    view.append(nav);
    if (data.note) view.append(el("p", data.note, "muted"));
    notes(data);
    const cards = el("div", void 0, "cards");
    for (const item of data.items || data.books || []) {
      const href = kind === "commentary" ? route("read", { kind, uid: item.uid }) : kind === "post" ? route("read", { kind, uid: item.id }) : item.read_with?.book ? route("read", { book: item.read_with.book }) : item.citation ? route("read", { uid: item.id }) : route("browse", { node: item.id });
      const card = link("", href, "entry");
      card.append(el("small", kind === "canon" ? item.citation || item.pitaka || "Collection" : kind === "commentary" ? "Commentary \xB7 not canon" : "Later work \xB7 not canon"), el("strong", item.name || item.title || item.id));
      if (item.texts !== void 0) card.append(el("p", item.texts + " texts"));
      if (item.english_available !== void 0) card.append(el("p", item.english_available ? "English source linked" : item.shared_english_available || item.partial_english_available ? "Scoped English source \xB7 review required" : "P\u0101li source text"));
      cards.append(card);
    }
    view.append(cards);
    pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, (n) => route("browse", { node, offset: n }));
    if (kind !== "canon") provenance(data);
  }
  async function browseEnglish(args, token) {
    const selection = englishSelection(args);
    const request2 = { node: "english", availability: selection.availability, offset: selection.offset, limit: selection.limit, ...selection.collection === null ? {} : { collection: selection.collection } };
    const response = await tool("browse_canon", request2);
    if (token !== epoch) return;
    const data = englishCatalogue(response, selection);
    heading("EXPLORE THE LIBRARY", "Find English sources");
    const nav = el("nav", void 0, "toolbar");
    nav.setAttribute("aria-label", "Library views");
    nav.append(link("All collections", "#browse?node=canon", "button"), link("Complete source books", "#browse?node=books", "button"));
    view.append(nav);
    const form = el("form", void 0, "english-catalogue-filters");
    form.setAttribute("aria-label", "English source filters");
    const availabilityLabel = el("label", "English availability"), availability = el("select");
    availability.id = "english-availability";
    availability.name = "availability";
    availabilityLabel.htmlFor = availability.id;
    for (const [value, title] of Object.entries(ENGLISH_AVAILABILITY)) {
      const option = el("option", title);
      option.value = value;
      availability.append(option);
    }
    availability.value = selection.availability;
    const collectionLabel = el("label", "Collection"), collection = el("select");
    collection.id = "english-collection";
    collection.name = "collection";
    collectionLabel.htmlFor = collection.id;
    const all = el("option", "All collections");
    all.value = "";
    collection.append(all);
    for (const item of data.collections) {
      const option = el("option", item.name);
      option.value = item.id;
      collection.append(option);
    }
    collection.value = selection.collection || "";
    const apply = el("button", "Apply");
    apply.type = "submit";
    form.append(availabilityLabel, availability, collectionLabel, collection, apply);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (token !== epoch) return;
      const href = englishRoute({ availability: availability.value, collection: collection.value || null }, 0);
      focusHeading();
      if (location.hash === href) render();
      else location.hash = href;
    });
    view.append(form, el("p", data.total + " matching indexed record" + (data.total === 1 ? "" : "s"), "english-catalogue-count"), el("p", data.note, "notice"), el("p", "A link is not a guarantee of a complete individual English translation. Review the publisher reference and any scope before retrieving English.", "muted"));
    if (!data.total) view.append(el("p", "No matching records in this index for these filters. This does not mean that no translation exists elsewhere.", "notice"));
    else if (selection.offset >= data.total) view.append(el("p", "This page is beyond the matching records."), link("Return to first matching page", englishRoute(selection, 0), "button"));
    else view.append(el("p", "Showing " + (selection.offset + 1) + "\u2013" + (selection.offset + data.items.length) + " of " + data.total, "muted"));
    const cards = el("div", void 0, "cards");
    for (const item of data.items) {
      const card = link("", route("read", { uid: item.id }), "entry");
      card.append(el("small", item.citation + " \xB7 " + item.collection), el("strong", item.title));
      for (const badge of englishBadges(item)) card.append(el("p", badge, "source-badge"));
      if (item.source_context) card.append(el("p", "Linked through " + item.source_context.citation + " \xB7 " + item.source_context.title + ". The containing chapter or group link does not establish a separately aligned translation.", "muted"));
      cards.append(card);
    }
    view.append(cards);
    pageControls(data.next_offset, selection.offset > 0 && selection.offset < data.total ? Math.max(0, selection.offset - selection.limit) : null, (offset) => englishRoute(selection, offset));
  }
  function offsetOf(args) {
    const n = Number(args.get("offset") || 0);
    return Number.isSafeInteger(n) && n >= 0 && n <= 1e5 ? n : 0;
  }
  async function search(args, token) {
    const query = (args.get("q") || "").trim();
    if (!query) throw new Error("Enter words or a title to search.");
    const scope = ["commentary", "post"].includes(args.get("scope")) ? args.get("scope") : "canon";
    $("search-scope").value = scope;
    const offset = offsetOf(args), data = await tool(scope === "commentary" ? "search_commentary" : scope === "post" ? "search_post_canonical" : "search_texts", { query, offset, limit: 15, script: $("script").value });
    if (token !== epoch) return;
    heading(scope === "canon" ? "SEARCH THE CANON" : scope === "commentary" ? "SEARCH COMMENTARY \xB7 NOT CANON" : "SEARCH LATER WORKS \xB7 NOT CANON", "Results for \u201C" + query + "\u201D", "Search results");
    notes(data);
    if (data.expanded_from_english) view.append(el("p", "English keywords expanded into P\u0101li: " + JSON.stringify(data.expanded_from_english), "notice"));
    const seen = /* @__PURE__ */ new Set(), cards = el("div", void 0, "cards");
    for (const item of [...data.title_matches || [], ...data.results || data.matches || []]) {
      const command2 = item.read_with || {}, id2 = scope === "commentary" ? command2.uid : scope === "post" ? command2.citation : item.id || item.text_id || item.uid;
      if (!id2 || seen.has(id2)) continue;
      seen.add(id2);
      const a = link("", route("read", { uid: id2, ...scope !== "canon" ? { kind: scope } : {}, ...command2.offset !== void 0 ? { offset: command2.offset } : {}, ...item.segment_ref ? { ref: item.segment_ref } : {} }), "entry");
      a.append(el("small", item.citation || id2), el("strong", item.title || item.book?.title || item.citation || id2));
      if (item.excerpt || item.text) a.append(el("p", item.excerpt || item.text));
      cards.append(a);
    }
    view.append(cards);
    if (!seen.size) view.append(el("p", "No matches on this page. Try a citation, a shorter phrase, or P\u0101li keywords."));
    const next = [data.next_offset, data.title_next_offset].filter((x) => x !== null && x !== void 0);
    pageControls(next.length ? Math.min(...next) : null, offset ? Math.max(0, offset - 15) : null, (n) => route("search", { q: query, scope, offset: n }));
    if (scope !== "canon") provenance(data);
  }
  function readingArgs(selector) {
    if (selector.startsWith("commentary-ref:")) return { kind: "commentary", uid: selector.slice(15) };
    if (selector.startsWith("book:")) return { book: selector.slice(5) };
    if (selector.startsWith("post:")) return { kind: "post", uid: selector.slice(5) };
    if (selector.startsWith("commentary:")) return { kind: "commentary", uid: selector };
    return { uid: selector };
  }
  var copySavedRecord = (item) => item === void 0 ? void 0 : JSON.parse(JSON.stringify(item));
  var savedRecord = (item) => local.saved.find((x) => x.uid === item.uid && x.ref === item.ref);
  var sameSavedRecord = (expected, token) => token === epoch && JSON.stringify(savedRecord(expected)) === JSON.stringify(expected);
  function replaceNoteDrafts(drafts) {
    noteDrafts.clear();
    for (const [key3, value] of drafts) noteDrafts.set(key3, value);
  }
  function commitNoteChange(transaction, keepNewBookmark = false) {
    local.saved = transaction.saved;
    if (persist()) {
      replaceNoteDrafts(transaction.drafts);
      refreshPersonalHighlights();
      return true;
    }
    if (!keepNewBookmark) {
      const before = restorePassageNoteTransaction(transaction);
      local.saved = before.saved;
      replaceNoteDrafts(before.drafts);
    }
    refreshPersonalHighlights();
    status2.textContent = storageWarning();
    return false;
  }
  function personalNoteEditor(item, context, token, { mode = "reading", onSaved = () => {
  }, onClose } = {}) {
    let expected = copySavedRecord(item);
    const editor = el("div", void 0, "personal-note-editor"), label = el("label", mode === "saved" ? "Your personal note" : "Your personal note for " + item.ref), input = el("textarea");
    input.className = "note-field";
    input.maxLength = 4e3;
    input.value = noteDrafts.get(noteKey(item)) ?? (typeof item.note === "string" ? item.note : "");
    label.append(input);
    const message = el("p", noteDrafts.has(noteKey(item)) ? "Unsaved personal note in this tab." : "Personal note \xB7 not scripture.", "muted");
    message.setAttribute("role", "status");
    const valid = () => editor.isConnected && sameSavedRecord(expected, token);
    input.addEventListener("input", () => {
      if (!valid()) {
        message.textContent = "This bookmark changed. Reopen it before editing; no note was overwritten.";
        return;
      }
      noteDrafts.set(noteKey(expected), input.value);
      message.textContent = "Unsaved personal note in this tab. Save or export before closing this browser tab.";
    });
    const controls = el("div", void 0, "toolbar");
    controls.append(button("Save note", () => {
      if (!valid()) {
        message.textContent = "This bookmark changed. Reopen it before saving; no note was overwritten.";
        return;
      }
      try {
        const change = passageNoteTransaction(local.saved, noteDrafts, context, { type: "save", mode, note: input.value });
        const durable = commitNoteChange(change);
        expected = copySavedRecord(savedRecord(item));
        message.textContent = durable ? "Personal note saved in this browser." : "Not saved to browser storage. Your draft remains in this tab; export it before reloading.";
        if (durable) status2.textContent = "Personal note saved in this browser.";
        onSaved(durable);
      } catch (error) {
        message.textContent = error.message;
      }
    }));
    if (onClose) controls.append(button("Close note editor", () => {
      if (token === epoch) onClose();
    }));
    editor.append(label, message, controls);
    return editor;
  }
  function removePersonalBookmark(item, token, host, trigger, onRemoved) {
    if (!sameSavedRecord(item, token)) {
      status2.textContent = "This bookmark changed. Review it again before removing it.";
      return;
    }
    const snapshot = copySavedRecord(item), key3 = noteKey(item), hadDraft = noteDrafts.has(key3), draft = noteDrafts.get(key3);
    const valid = () => host.isConnected && sameSavedRecord(snapshot, token) && noteDrafts.has(key3) === hadDraft && noteDrafts.get(key3) === draft;
    function remove(confirmed) {
      if (!valid()) {
        status2.textContent = "The bookmark or draft changed. Cancel removal and review it again; nothing was removed.";
        return;
      }
      try {
        const change = passageNoteTransaction(local.saved, noteDrafts, { uid: item.uid, ref: item.ref }, { type: "remove", mode: "saved", confirmed });
        if (commitNoteChange(change)) {
          status2.textContent = "Bookmark removed from this browser.";
          onRemoved();
        }
      } catch (error) {
        status2.textContent = error.message;
      }
    }
    if (!passageNoteRemovalNeedsConfirmation(item, noteDrafts)) {
      remove(false);
      return;
    }
    host.querySelector(".note-removal-confirmation")?.remove();
    const confirmation = el("div", void 0, "note-removal-confirmation");
    confirmation.setAttribute("role", "group");
    confirmation.setAttribute("aria-label", "Confirm bookmark and note removal");
    const cancel = button("Cancel removal", () => {
      if (token !== epoch) return;
      confirmation.remove();
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    });
    confirmation.append(el("p", "Remove this saved reference and its stored or unsaved personal note? Export first if you want to keep them.", "notice"), cancel, button("Remove bookmark and note", () => remove(true)));
    host.append(confirmation);
    cancel.focus({ preventScroll: true });
  }
  function attachPassageNote(selector, data, segment, container, control, token) {
    const region = el("section", void 0, "personal-note");
    region.setAttribute("aria-label", "Personal note for " + segment.ref);
    container.append(region);
    let context, open = false;
    try {
      context = { uid: selector, ref: segment.ref, title: data.title || data.book?.title || data.citation || data.book_id || selector, offset: data.offset + data.segments.indexOf(segment), source_commit: sourceRevision(data) };
    } catch (error) {
      region.append(el("p", "This source has no safe note reference: " + error.message, "notice"), link("See saved bookmark and note", "#saved"));
      return;
    }
    highlightTargets.push({ node: container, context, token });
    const key3 = noteKey(context);
    open = noteDrafts.has(key3) || Boolean(savedRecord(context)?.note);
    function mark() {
      const active = Boolean(savedRecord(context));
      control.textContent = active ? "Saved \u2713" : "Save passage";
      control.setAttribute("aria-pressed", String(active));
      container.classList.toggle("marked", active);
      container.classList.toggle("personal-highlight", savedPassageHighlighted(local.saved, context, local.highlight_saved !== false));
    }
    function ensure() {
      const change = passageNoteTransaction(local.saved, noteDrafts, context, { type: "ensure" });
      const durable = commitNoteChange(change, true);
      mark();
      if (durable) status2.textContent = "Passage reference saved. Personal notes remain separate from scripture.";
      return savedRecord(context);
    }
    function show() {
      if (token !== epoch) return;
      region.replaceChildren();
      mark();
      const state = passageNoteState(local.saved, context);
      if (!state.eligible) {
        region.append(el("p", state.reason + " No personal note was associated with this reading.", "notice"), link("See saved bookmark and note", "#saved"));
        return;
      }
      if (state.warning) region.append(el("p", state.warning, "notice"));
      if (open && state.item) {
        region.append(el("p", "Personal note \xB7 not scripture. Only the saved reference and your note are stored in this browser, not the source text.", "muted"), personalNoteEditor(state.item, context, token, { onSaved: mark, onClose: () => {
          open = false;
          show();
          region.querySelector("button")?.focus({ preventScroll: true });
        } }));
      } else region.append(button(state.item ? "View/edit personal note" : "Add personal note", () => {
        if (token !== epoch) return;
        try {
          if (!savedRecord(context)) ensure();
          open = true;
          show();
          region.querySelector("textarea")?.focus({ preventScroll: true });
        } catch (error) {
          status2.textContent = error.message;
        }
      }));
    }
    control.addEventListener("click", () => {
      if (token !== epoch) return;
      const current = savedRecord(context);
      if (current) removePersonalBookmark(current, token, region, control, () => {
        open = false;
        show();
        control.focus({ preventScroll: true });
      });
      else try {
        ensure();
        show();
      } catch (error) {
        status2.textContent = error.message;
      }
    });
    show();
  }
  async function read(args, token) {
    assertPageRequest(args);
    const book = args.get("book"), uid2 = args.get("uid") || "dhp183";
    let offset = offsetOf(args), plan = null, window2 = null;
    if (args.has("plan")) {
      if (book || args.has("kind")) throw Error("Reading plans require their canonical text selection.");
      const name = args.get("plan"), day = Number(args.get("day"));
      plan = planDay(await tool("reading_plan", { name, day }), name, day);
      if (token !== epoch) return;
      window2 = planWindow(plan, uid2, args.has("offset") ? Number(args.get("offset")) : void 0);
      offset = window2.offset;
    }
    const kind = book ? "book" : ["commentary", "post"].includes(args.get("kind")) ? args.get("kind") : "canon";
    const request2 = { ...kind === "book" ? { book } : kind === "post" ? { citation: uid2 } : { uid: uid2 }, offset, limit: window2?.limit || 30, script: $("script").value };
    const data = await tool(kind === "commentary" ? "get_commentary" : kind === "post" ? "get_post_canonical" : "get_text", request2);
    if (token !== epoch) return;
    if (!Array.isArray(data.segments)) throw new Error("Choose an individual book or passage to read.");
    assertPositionPin(args, data);
    assertPagePin(args, data);
    if (args.has("ref") && !data.segments.some((segment) => segment.ref === args.get("ref"))) throw Error("The saved passage reference was not returned at this position. No nearby passage was substituted. Open the source from the Library or check the bookmark\u2019s revision.");
    if (plan) validatePlanPage(data, plan, uid2, window2);
    if (kind === "post" && data.canonical !== false || kind === "commentary" && !(data.canonical === false && data.content_type === "commentary") && !(typeof data.label === "string" && data.label.startsWith("Commentary") && data.label.includes("not the canon"))) throw new Error("This response lacks the expected non-canonical source label.");
    const selector = kind === "book" ? "book:" + book : kind === "post" ? "post:" + uid2 : kind === "canon" ? data.text_id || uid2 : uid2.startsWith("commentary:") ? uid2 : "commentary-ref:" + uid2;
    heading(kind === "book" ? "COMPLETE VRI SOURCE BOOK" : kind === "commentary" ? "TRADITIONAL COMMENTARY \xB7 NOT CANON" : kind === "post" ? "LATER P\u0100LI WORK \xB7 NOT CANON" : "CANONICAL P\u0100LI", (data.citation ? data.citation + " \xB7 " : "") + (data.title || data.book?.title || data.book_id || uid2));
    if (plan) {
      view.append(link("\u2190 Return to plan day " + plan.day, route("plans", { name: plan.name, day: plan.day }), "button"), el("p", plan.title + " \xB7 day " + plan.day + (window2.end === null ? " \xB7 complete selected text" : " \xB7 assigned segments " + (window2.start + 1) + "\u2013" + window2.end) + ". English sources and related material may cover more than this assignment; they are not aligned to this part.", "notice"));
    }
    notes(data);
    view.append(el("p", `Segments ${offset + 1}\u2013${offset + data.returned} of ${data.total_segments}`, "muted"));
    const toolbar = el("div", void 0, "toolbar");
    toolbar.append(link("Back to library", route("browse", { node: "canon" }), "button"));
    const copyFallback = link("Exact reading link \xB7 open or long-press to copy", location.hash);
    copyFallback.hidden = true;
    const copy = button("Copy reading link", async () => {
      clearTimeout(positionTimer);
      const href = new URL(activePosition?.links.find((x) => x.href === local.last)?.href || activePosition?.links[0]?.href || location.hash, location.href).href;
      try {
        await navigator.clipboard.writeText(href);
        status2.textContent = "Reading link copied.";
      } catch {
        copyFallback.href = href;
        copyFallback.hidden = false;
        status2.textContent = "Clipboard unavailable. Use the exact reading link beside the button.";
      }
    });
    if (kind === "canon") {
      const panel = el("details", void 0, "study-actions");
      panel.append(el("summary", "Study & sources"));
      const tools = el("div", void 0, "toolbar");
      const invoke = (action) => () => {
        if (narrowReading.matches) panel.open = false;
        action();
        const target = $("study");
        target.tabIndex = -1;
        target.focus();
      };
      tools.append(button("English sources", invoke(() => translations(data, uid2, token))), button("Traditional commentary", invoke(() => commentary(uid2, token))), button("Related texts", invoke(() => relatedTexts(data.text_id || uid2, token))), copy, copyFallback);
      panel.append(tools);
      toolbar.append(panel);
    } else toolbar.append(copy, copyFallback);
    view.append(toolbar);
    responsivePanels();
    const positionContext = { ...readingArgs(selector), ...plan ? { plan: plan.name, day: plan.day } : {} };
    let navigation = null;
    try {
      const bounds = readingPageBounds(data, window2), revision3 = sourceRevision(data);
      readingPagePosition(positionContext, bounds.current, revision3);
      navigation = { bounds, revision: revision3 };
      const form = el("form", void 0, "source-position"), label = el("label", "Go to source position"), input = el("input"), submit = el("button", "Go"), help = el("p", `Position in this work, not a citation number. Available positions ${bounds.start + 1}\u2013${bounds.end}.`, "muted"), error = el("p");
      form.setAttribute("aria-label", "Source position navigation");
      form.noValidate = true;
      input.type = "text";
      input.inputMode = "numeric";
      input.maxLength = 32;
      input.value = String(bounds.current + 1);
      input.required = true;
      const suffix = String(++serial);
      help.id = "source-position-help-" + suffix;
      error.id = "source-position-error-" + suffix;
      error.setAttribute("role", "alert");
      error.hidden = true;
      input.setAttribute("aria-describedby", help.id + " " + error.id);
      label.append(input);
      submit.type = "submit";
      form.append(label, submit, help, error);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (token !== epoch || !form.isConnected) return;
        try {
          const jump = readingJumpOffset(input.value, data, window2), href = readingPagePosition(positionContext, jump, revision3);
          error.hidden = true;
          input.removeAttribute("aria-invalid");
          if (location.hash === href) render();
          else location.hash = href;
        } catch (failure2) {
          error.textContent = failure2.message;
          error.hidden = false;
          input.setAttribute("aria-invalid", "true");
          input.focus({ preventScroll: true });
        }
      });
      view.append(form);
    } catch {
      view.append(el("p", "Source-position navigation is unavailable because this page has incomplete or unsupported position/revision metadata. The loaded source remains below; no destination was guessed.", "notice"));
    }
    const additions = el("section");
    additions.id = "study";
    additions.setAttribute("aria-live", "polite");
    view.append(additions);
    const passages = el("section");
    passages.setAttribute("aria-label", "P\u0101li passage");
    const positions = [];
    for (const segment of data.segments || []) {
      const part = el("article", void 0, "segment " + (segment.type === "heading" ? "heading" : ""));
      part.id = "seg-" + segment.ref.replace(/[^a-z0-9-]/gi, "-");
      let positionHref;
      try {
        positionHref = readingPosition(positionContext, data.offset + data.segments.indexOf(segment), segment.ref, sourceRevision(data));
      } catch {
      }
      const row = el("div", void 0, "segment-label"), reference = el("span");
      if (positionHref) {
        const exact3 = link(segment.ref, positionHref);
        exact3.setAttribute("aria-label", "Open exact passage " + segment.ref);
        reference.append(exact3);
      } else reference.textContent = segment.ref;
      if (segment.vri_paragraph) reference.append(document.createTextNode(" \xB7 VRI " + segment.vri_paragraph));
      row.append(reference);
      const active = local.saved.some((x) => x.uid === selector && x.ref === segment.ref);
      const save = button(active ? "Saved \u2713" : "Save passage", () => {
      });
      save.setAttribute("aria-label", "Save passage " + segment.ref);
      save.setAttribute("aria-pressed", String(active));
      const actions = el("div", void 0, "segment-actions");
      actions.append(save);
      if (kind !== "commentary" && segment.type !== "heading") {
        const study = button("Study words", () => wordStudy({ ...kind === "book" ? { book } : { uid: kind === "canon" ? data.text_id || uid2 : uid2 }, segment: segment.ref, offset: 0, limit: 15 }, { ref: segment.ref, text: segment.text, source: data.source?.commit, script: $("script").value, kind }, token));
        study.setAttribute("aria-label", "Study words in " + segment.ref);
        actions.append(study);
      }
      row.append(actions);
      part.classList.toggle("marked", active);
      const text5 = el("p", segment.text, "passage");
      text5.lang = "pi";
      part.append(row, text5);
      attachPassageNote(selector, data, segment, part, save, token);
      passages.append(part);
      if (positionHref) positions.push({ node: part, heading: segment.type === "heading", href: positionHref });
    }
    view.append(passages);
    if (navigation) {
      const { bounds, revision: revision3 } = navigation, next = data.next_offset !== null && data.next_offset < bounds.end ? data.next_offset : null;
      pageControls(next, bounds.current > bounds.start ? Math.max(bounds.start, bounds.current - 30) : null, (n) => readingPagePosition(positionContext, n, revision3));
    }
    provenance(data);
    activePosition = { token, links: positions };
    rememberPosition(positions.find((x) => args.get("ref") === new URLSearchParams(x.href.split("?")[1]).get("ref"))?.href || positions[0]?.href || location.hash);
    updateResume();
    let savedRevision;
    try {
      savedRevision = sourceRevision(data);
    } catch {
    }
    const savedVersion = savedRevision === void 0 ? null : local.saved.find((x) => x.uid === selector && x.source_commit && x.source_commit !== savedRevision);
    if (savedVersion) view.prepend(el("p", "This source revision differs from a saved bookmark. Check its reference before reusing your notes.", "notice"));
    const ref = args.get("ref");
    if (ref) document.getElementById("seg-" + ref.replace(/[^a-z0-9-]/gi, "-"))?.scrollIntoView({ block: "center" });
  }
  function scopeSummary(descriptor, target) {
    const scope = descriptor.scope;
    target.append(el("h4", descriptor.label));
    if (descriptor.kind === "shared_page") {
      target.append(el("p", "Publisher reference: " + scope.source_reference), el("p", "One page concerns all of these texts. It is not a separately aligned full translation of the currently selected discourse.", "notice"));
      const list = el("ul");
      for (const id2 of scope.text_ids) {
        const li = el("li");
        li.append(link(id2 + " \xB7 canonical P\u0101li", route("read", { uid: id2 })));
        list.append(li);
      }
      target.append(list);
    } else {
      target.append(el("p", "Declared P\u0101li span: " + scope.first_ref + " to " + scope.last_ref));
      if (scope.version === 2) {
        target.append(el("p", "Only part of this paragraph is translated. Exact original P\u0101li excerpt:", "notice"));
        const quote = el("blockquote", scope.pali_excerpt.text, "passage");
        quote.lang = "pi";
        target.append(quote);
        target.append(el("p", "The P\u0101li reader below includes surrounding context outside this translation. No complete paragraph or discourse translation is implied.", "notice"));
      } else target.append(el("p", "Only this span has a linked translation. The P\u0101li reader below still shows the selected canonical text, not an aligned or shortened English/P\u0101li pair.", "notice"));
    }
    target.append(el("p", scope.note, "notice"));
    const details = el("details");
    details.append(el("summary", "Reviewed scope version"));
    details.append(el("p", "Source revision: " + scope.source_commit), el("p", "Mapping SHA-256: " + scope.scope_sha256));
    target.append(details);
  }
  async function translations(data, uid2, token) {
    const pickerToken = ++studyEpoch;
    requests.cancelGroup("study");
    const target = $("study");
    target.replaceChildren(el("h3", "English sources"));
    if (!data.english_available?.length) {
      target.append(el("p", "No verified English source is linked to this text. No translation has been generated or substituted.", "notice"));
      return;
    }
    const context = { uid: data.text_id || uid2, citation: data.citation || uid2, choices: JSON.parse(JSON.stringify(data.english_available)), accepted: null };
    target.append(el("p", "Choose a publisher\u2019s source page. It can cover more than the current P\u0101li selection; paragraphs are not aligned. Shared and partial sources require a separate scope review before retrieval.", "muted"));
    const selected = /* @__PURE__ */ new Set(), comparisonInputs = [];
    let ordinary = [];
    try {
      ordinary = comparisonChoices(context.choices, context.uid);
    } catch (error) {
      target.append(el("p", error.message, "notice"));
    }
    const comparison = el("section", void 0, "comparison-selection");
    comparison.setAttribute("aria-label", "Compare English source versions");
    const selectionStatus = el("p", "Select 2\u20134 ordinary source versions. No English is fetched until you press Compare.", "muted");
    selectionStatus.setAttribute("role", "status");
    const compare = button("Compare selected sources", () => {
      if (token === epoch && pickerToken === studyEpoch) compareEnglishSources([...selected], token, context);
    });
    compare.disabled = true;
    comparison.append(el("p", "Shared and partial sources are excluded from comparison. Use their individual scope review and consent controls.", "notice"), selectionStatus, compare);
    if (ordinary.length >= 2) target.append(comparison);
    else target.append(el("p", "Comparison requires at least two ordinary source versions. Shared and partial sources keep their individual review and consent controls.", "muted"));
    function updateComparison() {
      compare.disabled = selected.size < 2 || selected.size > 4;
      selectionStatus.textContent = selected.size + " of 4 source versions selected. Select 2\u20134 to compare; selections alone do not retrieve English.";
      for (const input of comparisonInputs) input.disabled = !input.checked && selected.size >= 4;
    }
    for (const choice of context.choices) {
      const card = el("article", void 0, "translation-choice");
      card.append(el("h4", choice.translator || choice.translation_id), el("p", [choice.source, choice.reference].filter(Boolean).join(" \xB7 "), "muted"));
      try {
        if (typeof choice.translation_id !== "string" || !/^(dt|ati|aj):.+/.test(choice.translation_id)) throw new Error("This source has no supported exact version identifier. No source was requested.");
        const descriptor = scopeDescriptor(choice, context.uid);
        if (!descriptor && ordinary.length >= 2 && ordinary.some((c) => c.translation_id === choice.translation_id)) {
          const label = el("label", void 0, "comparison-checkbox"), input = el("input");
          input.type = "checkbox";
          input.value = choice.translation_id;
          label.append(input, el("span", "Compare \xB7 " + [choice.translator, choice.source, choice.reference, choice.translation_id].filter(Boolean).join(" \xB7 ")));
          input.addEventListener("change", () => {
            if (token !== epoch || pickerToken !== studyEpoch) return;
            if (input.checked) selected.add(choice.translation_id);
            else selected.delete(choice.translation_id);
            updateComparison();
          });
          comparisonInputs.push(input);
          card.append(label);
        }
        if (descriptor) {
          card.append(el("p", descriptor.label + " \xB7 not whole-unit coverage", "notice"), button("Review " + descriptor.label.toLowerCase(), () => reviewTranslationScope(choice, descriptor, context, token)));
        } else card.append(button("Read source \xB7 " + [choice.translator, choice.source, choice.reference].filter(Boolean).join(" \xB7 "), () => englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6e3 }, token, context)));
      } catch (error) {
        card.append(el("p", error.message, "notice"));
      }
      target.append(card);
    }
  }
  function compareEnglishSources(selected, token, context) {
    if (token !== epoch) return;
    let ids;
    try {
      ids = comparisonSelection(selected, context.choices, context.uid);
    } catch (error) {
      $("study").append(el("p", error.message, "notice"));
      return;
    }
    const studyToken = ++studyEpoch, target = studyTarget("Opening the explicitly selected source comparison\u2026");
    target.replaceChildren(el("h3", "Compare English sources"), el("p", "These are separate publisher pages, not aligned paragraphs or translations of only the displayed P\u0101li passage. Each source may extend beyond your current reading-plan assignment. Review each source\u2019s notes, reference and licence before quoting.", "notice"));
    target.append(button("Choose English sources", () => {
      if (token === epoch && studyToken === studyEpoch) translations({ text_id: context.uid, citation: context.citation, english_available: context.choices }, context.uid, token);
    }));
    const grid = el("div", void 0, "comparison-grid");
    target.append(grid);
    let focusIntent = 0;
    for (const id2 of ids) {
      const choice = context.choices.find((c) => c.translation_id === id2), panel = el("article", void 0, "comparison-panel");
      panel.setAttribute("aria-label", "English comparison source \xB7 " + id2);
      panel.setAttribute("aria-busy", "false");
      panel.append(el("h4", [choice.translator, choice.source, choice.reference].filter(Boolean).join(" \xB7 ")), el("p", "Source version: " + id2, "muted"));
      const message = el("p", "No English requested yet.", "comparison-panel-status");
      message.setAttribute("role", "status");
      message.setAttribute("aria-label", "Comparison status \xB7 " + id2);
      const progress = el("p", void 0, "comparison-progress"), body = el("div", void 0, "comparison-panel-body"), actions = el("div", void 0, "toolbar comparison-actions");
      panel.append(message, progress, body, actions);
      grid.append(panel);
      const state = { serial: 0, busy: false };
      const current = () => token === epoch && studyToken === studyEpoch && panel.isConnected;
      async function loadPage(args, moveFocus = false) {
        if (!current() || state.busy) return;
        const requestSerial = ++state.serial, focusTicket = moveFocus ? ++focusIntent : null;
        state.busy = true;
        panel.setAttribute("aria-busy", "true");
        const ownsFocus = () => moveFocus && focusTicket === focusIntent && (panel.contains(document.activeElement) || document.activeElement === document.body);
        for (const control of actions.querySelectorAll("button")) control.disabled = true;
        message.textContent = "Retrieving this exact source page\u2026";
        const sameRequest = () => current() && requestSerial === state.serial;
        try {
          const data = await tool("get_translation", args, "study", "English comparison " + id2);
          if (!sameRequest()) return;
          const next = validateComparisonPage(data, args, { uid: context.uid, choices: [choice], accepted: null });
          const content = el("div");
          notes(data, content);
          content.append(el("p", data.text, "translation"));
          provenance(data, content);
          body.replaceChildren(content);
          progress.textContent = "English characters " + (data.offset + 1) + "\u2013" + (data.offset + data.text.length) + (next ? " \xB7 more pages available" : " \xB7 end of this source");
          message.textContent = "Selected source page loaded.";
          actions.replaceChildren();
          if (next) actions.append(button("Next English page \u2192", () => loadPage(next, true)));
          if (ownsFocus()) {
            progress.tabIndex = -1;
            progress.focus({ preventScroll: true });
          }
        } catch (error) {
          if (!sameRequest()) return;
          message.textContent = error.message + (body.textContent ? " The previously loaded page remains shown." : "");
          actions.replaceChildren(button("Retry this source page", () => loadPage(args, true)));
          if (!body.textContent) progress.textContent = "No source text has been displayed.";
          if (ownsFocus()) {
            message.tabIndex = -1;
            message.focus({ preventScroll: true });
          }
        } finally {
          if (sameRequest()) {
            state.busy = false;
            panel.setAttribute("aria-busy", "false");
            for (const control of actions.querySelectorAll("button")) control.disabled = false;
          }
        }
      }
      loadPage({ uid: context.uid, translation: id2, limit: 6e3 });
    }
  }
  function reviewTranslationScope(choice, descriptor, context, token) {
    ++studyEpoch;
    const target = studyTarget("Review the source before retrieving it.");
    target.replaceChildren(el("h3", "Review English source scope"));
    target.append(el("p", "P\u0101li selection: " + context.citation), el("p", [choice.translator, choice.source, choice.reference].filter(Boolean).join(" \xB7 ")));
    scopeSummary(descriptor, target);
    if (typeof choice.mapping_note === "string" && choice.mapping_note.trim()) target.append(el("p", choice.mapping_note, "notice"));
    const label = el("label", void 0, "consent-row"), checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.id = "scope-consent";
    label.append(checkbox, el("span", descriptor.kind === "shared_page" ? "I understand this is one shared source page with unverified individual alignment, not a full translation assigned to this one discourse." : "I understand this translates only the declared part of the P\u0101li unit, not the entire unit."));
    const read2 = button(descriptor.kind === "shared_page" ? "Read reviewed shared page" : "Read reviewed partial source", () => {
      if (checkbox.checked && token === epoch) englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6e3, ...descriptor.flags }, token, { ...context, accepted: descriptor });
    });
    read2.disabled = true;
    checkbox.addEventListener("change", () => {
      read2.disabled = !checkbox.checked;
    });
    target.append(label, read2);
  }
  async function englishPage(args, token, context) {
    const studyToken = ++studyEpoch;
    const target = studyTarget("Retrieving the selected English source page\u2026");
    try {
      const data = await tool("get_translation", args, "study");
      if (token !== epoch || studyToken !== studyEpoch) return;
      const next = validateEnglishPage(data, args, context), actualChoice = context.choices.find((c) => c.translation_id === data.translation_id);
      target.replaceChildren(el("h3", (context.accepted?.kind === "shared_page" ? "Shared English source page \xB7 " : context.accepted ? "Partial English source \xB7 " : "English source page \xB7 ") + data.translator));
      target.append(el("p", "P\u0101li selection: " + context.citation + " \xB7 publisher reference: " + (actualChoice.reference || data.citation), "muted"), el("p", "Source version: " + data.translation_id, "muted"));
      if (context.accepted) scopeSummary(context.accepted, target);
      if (data.translation_id !== args.translation) target.append(el("p", "The server returned a different listed source version. Read its source and fallback notes before quoting.", "notice"));
      notes(data, target);
      target.append(el("p", data.text, "translation"));
      provenance(data, target);
      if (next) target.append(button("Next English page \u2192", () => englishPage(next, token, context)));
      target.append(button("Reload passage and review sources", render));
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"), button("Retry selected source", () => englishPage(args, token, context)), button("Reload passage and review sources", render));
    }
  }
  async function commentary(uid2, token, offset = 0) {
    const studyToken = ++studyEpoch;
    requests.cancelGroup("study");
    const target = $("study");
    target.replaceChildren(el("p", "Opening commentary\u2026"));
    try {
      const data = await tool("get_commentary", { uid: uid2, offset, limit: 20, script: $("script").value }, "study");
      if (token !== epoch || studyToken !== studyEpoch) return;
      target.replaceChildren(el("h3", "Traditional commentary \xB7 not canonical root text"));
      notes(data, target);
      for (const segment of data.segments || []) target.append(el("p", segment.text, "passage"));
      if (data.next_offset !== null && data.next_offset !== void 0) target.append(button("Next commentary page \u2192", () => commentary(uid2, token, data.next_offset)));
      if (data.available === false || !data.segments?.length) target.append(el("p", "No verified aligned commentary is available for this selection.", "notice"));
      provenance(data, target);
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"));
    }
  }
  function studyTarget(message) {
    requests.cancelGroup("study");
    const target = $("study");
    target.replaceChildren(el("p", message));
    target.tabIndex = -1;
    target.setAttribute("aria-label", "Study tools, separate from scripture");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
    return target;
  }
  async function wordStudy(args, expected, token) {
    const studyToken = ++studyEpoch, target = studyTarget("Looking up the selected passage in the bundled dictionary\u2026");
    try {
      const data = await tool("analyse_passage", args, "study");
      if (token !== epoch || studyToken !== studyEpoch) return;
      if (data.segment?.ref !== expected.ref || data.text_source?.commit !== expected.source || localizeText({ segments: data.segment ? [data.segment] : [] }, expected.script).segments[0]?.text !== expected.text) throw new Error("The returned analysis does not match the selected source passage. Reload the passage; no other analysis was substituted.");
      if (expected.kind === "post" && data.canonical !== false) throw new Error("The analysis lacks its later-work source label.");
      target.replaceChildren(el("h3", "Word study \xB7 dictionary reference"));
      target.append(el("p", data.guidance, "notice"));
      notes(data, target);
      target.append(el("p", "Source segment: " + data.segment.ref + " \xB7 forms and analysis shown in Roman P\u0101li", "muted"));
      if (data.dictionary_coverage_note) target.append(el("p", data.dictionary_coverage_note, "notice"));
      const list = el("div", void 0, "word-list");
      for (const word of data.words || []) {
        const item = el("article", void 0, "word-card");
        item.append(el("h4", word.surface));
        if (word.form && word.form !== word.surface) item.append(el("p", "Analysed form: " + word.form, "muted"));
        if (word.note) item.append(el("p", word.note, "muted"));
        if (word.status === "unknown") item.append(el("p", word.message || "Unknown in this dictionary subset; no meaning is guessed.", "notice"));
        for (const analysis of word.analyses || []) {
          const d = el("details");
          d.open = true;
          d.append(el("summary", analysis.headword + (analysis.pos ? " \xB7 " + analysis.pos : "")));
          if (analysis.grammar?.length) d.append(el("p", analysis.grammar.join("; "), "muted"));
          const meanings = el("ul");
          for (const sense of analysis.meanings || []) meanings.append(el("li", sense.lemma + ": " + sense.meaning));
          d.append(meanings);
          if (analysis.senses_total > (analysis.meanings || []).length) d.append(el("p", analysis.senses_total + " total senses; this tool returns an excerpt.", "muted"));
          if (analysis.root) d.append(el("p", "Root: " + analysis.root.root + (analysis.root.meaning ? " \xB7 " + analysis.root.meaning : ""), "muted"));
          if (analysis.note) d.append(el("p", analysis.note));
          item.append(d);
        }
        const splits = [word.split, ...word.other_splits || []].filter(Boolean);
        if (splits.length) item.append(el("p", "Computed split suggestions, not a translation: " + splits.join(" | "), "notice"));
        if (word.more_headwords) item.append(el("p", word.more_headwords + " further headwords are not displayed by this tool.", "muted"));
        list.append(item);
      }
      target.append(list);
      const pagination = el("div", void 0, "toolbar");
      if (args.offset > 0) pagination.append(button("\u2190 Previous words", () => wordStudy({ ...args, offset: Math.max(0, args.offset - args.limit) }, expected, token)));
      if (data.next_offset !== null && data.next_offset !== void 0) pagination.append(button("Next words \u2192", () => wordStudy({ ...args, offset: data.next_offset }, expected, token)));
      target.append(pagination);
      provenance({ ...data, edition: "Digital P\u0101\u1E37i Dictionary \xB7 reference material", source: void 0 }, target);
      provenance({ edition: "Passage source, separate from dictionary", source: data.text_source }, target);
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"), button("Retry this word study", () => wordStudy(args, expected, token)));
    }
  }
  async function relatedTexts(uid2, token, offset = 0) {
    const studyToken = ++studyEpoch, target = studyTarget("Finding recorded related passages\u2026");
    try {
      const data = await tool("get_parallels", { uid: uid2, offset, limit: 10 }, "study");
      if (token !== epoch || studyToken !== studyEpoch) return;
      if (typeof data.available !== "boolean" || !Array.isArray(data.links)) throw new Error("The related-text response is incomplete. No absence of relationships can be inferred.");
      target.replaceChildren(el("h3", "Related texts \xB7 evidence, not interpretation"));
      notes(data, target);
      if (!data.links?.length) target.append(el("p", data.available === false ? "Related-text data is unavailable in this server copy." : "No related link is recorded here. That does not mean no related passage exists.", "notice"));
      for (const relation of data.links || []) {
        const card = el("article", void 0, "word-card");
        card.append(el("p", relation.source === "shared-passage" ? "SHARED WORDING \xB7 MACHINE-MATCHED" : relation.source === "commentary-citation" ? "CITATION IN COMMENTARY \xB7 NOT CANON" : "REFERENCE LINK \xB7 " + relation.source, "eyebrow"), el("h4", (relation.text?.citation || "") + " \xB7 " + (relation.text?.title || "Related passage")), el("p", relation.relation), el("p", relation.how_matched, "muted"));
        if (relation.evidence) card.append(el("p", relation.evidence, "notice"));
        if (relation.score !== void 0) card.append(el("p", "Shared-word score: " + relation.score + " (not a probability or doctrinal-equivalence claim)", "muted"));
        const actions = el("div", void 0, "toolbar");
        const other = relation.other_read_with;
        if (other?.tool === "get_text" && typeof other.uid === "string") actions.append(link("Read shared passage", route("read", { uid: other.uid, offset: other.offset || 0, ...relation.other_segments?.[0] ? { ref: relation.other_segments[0] } : {} }), "button"));
        else if (relation.text?.id) actions.append(link("Read canonical text", route("read", { uid: relation.text.id }), "button"));
        if (relation.commentary?.read_with?.tool === "get_commentary" && typeof relation.commentary.read_with.uid === "string") actions.append(link("Read commentary evidence", route("read", { kind: "commentary", uid: relation.commentary.read_with.uid }), "button"));
        card.append(actions);
        target.append(card);
      }
      const pagination = el("div", void 0, "toolbar");
      if (offset > 0) pagination.append(button("\u2190 Previous related links", () => relatedTexts(uid2, token, Math.max(0, offset - 10))));
      if (data.next_offset !== null && data.next_offset !== void 0) pagination.append(button("Next related links \u2192", () => relatedTexts(uid2, token, data.next_offset)));
      target.append(pagination);
      if (data.suttacentral_parallels?.url) {
        target.append(el("p", data.suttacentral_parallels.note, "muted"), external("Explore external parallels (link only)", data.suttacentral_parallels.url));
      }
      provenance(data, target);
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"), button("Retry related-text lookup", () => relatedTexts(uid2, token, offset)));
    }
  }
  async function dictionary(args, token) {
    const term = (args.get("term") || "").trim(), direction = ["en-pa", "pa-en"].includes(args.get("direction")) ? args.get("direction") : "auto";
    heading("REFERENCE MATERIAL \xB7 NOT SCRIPTURE", "Words and meanings");
    const form = el("form");
    form.id = "glossary-form";
    const termLabel = el("label", "P\u0101li word or English phrase");
    termLabel.htmlFor = "glossary-term";
    const input = el("input");
    input.id = "glossary-term";
    input.name = "term";
    input.maxLength = 100;
    input.required = true;
    input.value = term;
    const directionLabel = el("label", "Direction");
    directionLabel.htmlFor = "glossary-direction";
    const select = el("select");
    select.id = "glossary-direction";
    for (const [value, label] of [["auto", "Both directions"], ["en-pa", "English \u2192 P\u0101li"], ["pa-en", "P\u0101li \u2192 English"]]) {
      const option = el("option", label);
      option.value = value;
      select.append(option);
    }
    select.value = direction;
    const submit = el("button", "Look up");
    submit.type = "submit";
    form.append(termLabel, input, directionLabel, select, submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const next = route("glossary", { term: input.value.trim(), direction: select.value });
      if (location.hash === next) render();
      else location.hash = next;
    });
    view.append(form, el("p", "Short sourced glosses help find terms. They are not passage translations or a decision about which meaning fits the context.", "notice"));
    if (!term) {
      view.append(el("p", "Try mindfulness, mett\u0101 or a word in a supported P\u0101li script. Nothing is generated."));
      return;
    }
    const data = await tool("glossary", { term, direction, limit: 10 });
    if (token !== epoch) return;
    if (typeof data.found !== "number" || !data.sources?.dpd?.attribution || !data.sources?.dpd?.license || !["english_to_pali", "pali_to_english"].some((key3) => Array.isArray(data[key3]))) throw new Error("The glossary response is incomplete or missing its source terms. This is not a no-match result.");
    notes(data);
    if (data.note) view.append(el("p", data.note, "notice"));
    for (const [key3, title] of [["english_to_pali", "English \u2192 P\u0101li"], ["pali_to_english", "P\u0101li \u2192 English"]]) {
      if (!data[key3]?.length) continue;
      view.append(el("h3", title));
      const cards = el("div", void 0, "cards");
      for (const entry of data[key3]) {
        const card = el("article", void 0, "entry");
        card.append(el("strong", entry.pali), el("p", entry.meaning || entry.gloss || ""), el("small", [entry.pos, entry.source].filter(Boolean).join(" \xB7 ")), link("Find this word in canonical texts", route("search", { q: entry.pali, scope: "canon" })));
        cards.append(card);
      }
      view.append(cards);
    }
    if (!data.found) view.append(el("p", "No matching term was found in the bundled glossary. No meaning has been invented. Try a shorter or differently spelled term.", "notice"));
    if (data.sources?.dpd) provenance({ edition: data.sources.dpd.name, dictionary: data.sources.dpd, attribution: data.sources.dpd.attribution, license: data.sources.dpd.license }, view);
    if (data.sources?.lists) view.append(el("p", data.sources.lists.name + " \xB7 " + data.sources.lists.note, "provenance"));
  }
  async function daily(args, token) {
    const kind = args.get("kind") || "verse", date = args.get("date") || void 0;
    if (!["verse", "sutta"].includes(kind)) throw Error("Choose a daily verse or discourse.");
    const data = validateDaily(await tool("daily_text", { kind, ...date ? { date } : {} }), { date, kind });
    if (token !== epoch) return;
    heading("DATED SOURCE READING \xB7 UTC", kind === "verse" ? "Daily Dhammapada verse" : "Daily discourse");
    view.append(el("p", data.date + " \xB7 fixed source rotation, not a personal recommendation. The selection may change when the underlying source index changes.", "muted"));
    const form = el("form");
    form.className = "daily-picker";
    const dateLabel = el("label", "Reading date (UTC)"), dateInput = el("input");
    dateInput.type = "date";
    dateInput.min = "0001-01-01";
    dateInput.max = "9999-12-31";
    dateInput.required = true;
    dateInput.value = data.date;
    dateLabel.append(dateInput);
    const kindLabel = el("label", "Reading type"), select = el("select");
    for (const [value, title] of [["verse", "Dhammapada verse"], ["sutta", "Discourse opening"]]) {
      const option = el("option", title);
      option.value = value;
      select.append(option);
    }
    select.value = kind;
    select.id = "daily-kind";
    kindLabel.htmlFor = select.id;
    const kindField = el("div");
    kindField.append(kindLabel, select);
    const go = el("button", "Open dated reading");
    go.type = "submit";
    form.append(dateLabel, kindField, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.reportValidity()) location.hash = route("daily", { date: dateInput.value, kind: select.value });
    });
    view.append(form, button("Use today\u2019s UTC date", () => {
      const target = route("daily", { kind });
      if (location.hash === target) render();
      else location.hash = target;
    }));
    const card = el("article", void 0, "daily-reading");
    card.append(el("h3", data.text.citation + (data.text.title ? " \xB7 " + data.text.title : "")));
    card.append(el("p", kind === "verse" ? "Referenced P\u0101li verse" : "Opening preview only \xB7 " + data.segments + " source segments in the discourse. Open the source to read the full text.", "notice"));
    const display = localizeText({ segments: kind === "verse" ? data.pali : [{ text: data.first_line, type: "paragraph" }] }, $("script").value);
    for (const segment of display.segments) {
      if (segment.ref) card.append(el("small", segment.ref, "muted"));
      const passage = el("p", segment.text, "passage");
      passage.lang = "pi";
      card.append(passage);
    }
    if (display.script) card.append(el("p", "Display transliteration from the bundled VRI Roman source; not a separate script-edition collation. " + (["lao", "lanna"].includes(display.script) ? "Native-reader validation is still pending for this script." : ""), "muted"));
    const actions = el("div", void 0, "toolbar");
    actions.append(link("Read P\u0101li source \xB7 " + data.text.citation, route("read", { uid: data.text.id }), "button"));
    if (kind === "verse" && data.chapter?.id) actions.append(link("Read chapter context \xB7 " + data.chapter.citation, route("read", { uid: data.chapter.id }), "button"));
    card.append(actions, el("p", "English sources, commentary, word study and saved passages are available in the full reader. English text is not retrieved automatically.", "muted"));
    view.append(card);
    notes(data);
    const details = el("details");
    details.append(el("summary", "How this reading was selected"), el("p", data.how_chosen), el("p", "Rotation position " + data.rotation.position + " of " + data.rotation.of + " \xB7 source revision " + data.source.pali.commit));
    view.append(details);
    provenance({ source: data.source.pali });
  }
  function exportPersonal(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = link("", url);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function downloadStudyBackup() {
    try {
      const omitted = local.remember_position !== false && Object.hasOwn(local, "last") && !isReadingLocator(local.last);
      exportPersonal(createStudyBackup({ saved: exportBookmarks().saved, progress: local.reading_progress, resume: local.remember_position !== false && isReadingLocator(local.last) ? local.last : null }), "pali-library-study-backup.json");
      if (omitted) status2.textContent = "Study backup downloaded. The unsupported reading position was omitted; saved passages, personal notes and plan marks were included. Browser data was not changed.";
    } catch (error) {
      status2.textContent = error.message + " Individual bookmark and progress exports remain available in Saved, Plans and browser recovery.";
    }
  }
  function studyBackup(token) {
    heading("PERSONAL DATA \xB7 ON THIS DEVICE", "Study backup");
    view.append(el("p", "Download saved references, personal notes (including unsaved edits), plan marks and an optional reading position. This file includes personal data: keep it somewhere private. The source-text library, accounts and browser preferences are excluded; your own notes are included.", "notice"), button("Download study backup", downloadStudyBackup));
    const section = el("section"), label = el("label", "Restore study backup from JSON"), input = el("input"), preview = el("section", void 0, "import-preview");
    input.type = "file";
    input.accept = ".json,application/json";
    label.append(input);
    preview.setAttribute("aria-label", "Study backup preview");
    preview.setAttribute("aria-live", "polite");
    section.append(label, el("p", "The file stays on this device. Maximum 32 MiB. Preview before applying: existing notes, drafts, source pins and conflicting marks are kept. This is an additive restore, not account sync or an atomic cross-tab transaction.", "muted"), preview);
    view.append(section, link("Saved passages and individual exports", "#saved", "button"), link("Reading plans and individual exports", "#plans", "button"));
    let generation = 0;
    const active = (request2) => token === epoch && request2 === generation && section.isConnected;
    const personalState = () => JSON.stringify({ saved: local.saved, progress: local.reading_progress, drafts: [...noteDrafts], rememberPresent: Object.hasOwn(local, "remember_position"), remember: local.remember_position });
    function storageNow() {
      if (storageConflict || storageReadFailed) throw Error(storageWarning());
      let raw;
      try {
        raw = localStorage.getItem(KEY);
      } catch {
        storageOK = false;
        showStorageRecovery();
        throw Error(storageWarning());
      }
      if (raw !== storageSnapshot && !readingPointerOnlyChange(storageSnapshot, raw)) {
        storageConflict = true;
        showStorageRecovery();
        throw Error(storageWarning());
      }
      return raw;
    }
    function failure2(error, request2, retry, filename) {
      if (!active(request2)) return;
      const title = el("h3", "Unable to restore study backup");
      title.tabIndex = -1;
      preview.replaceChildren(title, el("p", error.message, "notice"));
      if (filename) preview.append(el("p", "Local file: " + filename, "muted"));
      if (retry) preview.append(button("Retry plan verification", retry));
      preview.append(button("Cancel restore", cancel));
      title.focus();
    }
    function cancel() {
      ++generation;
      input.value = "";
      preview.replaceChildren();
      input.focus();
    }
    async function prepare(incoming, request2, filename) {
      if (!active(request2)) return;
      try {
        const state = personalState(), raw = storageNow(), localLastPresent = Object.hasOwn(local, "last"), localLast = local.last;
        preview.replaceChildren(el("p", incoming.progress.length ? "Verifying current reading-plan assignments\u2026" : "Preparing local preview\u2026"));
        const catalog = incoming.progress.length ? planCatalog(await tool("reading_plan", {})) : [];
        if (!active(request2)) return;
        if (personalState() !== state) throw Error("Personal study data changed while preparing this preview. Choose the file again. Nothing was restored.");
        const merged = mergeStudyBackup({ saved: local.saved, progress: local.reading_progress, drafts: noteDrafts }, incoming, catalog);
        const title = el("h3", "Review study backup");
        title.tabIndex = -1;
        preview.replaceChildren(title, el("p", "Local file: " + filename, "muted"), el("p", `Saved passages: ${merged.bookmarkAdded} new \xB7 ${merged.bookmarkDuplicates} duplicates \xB7 ${merged.bookmarkConflicts} conflicts kept`), el("p", `Plan marks: ${merged.progressAdded} new \xB7 ${merged.progressDuplicates} duplicates \xB7 ${merged.progressConflicts} conflicts kept`), el("p", "Existing notes, drafts and source pins win on a duplicate reference. Existing plan marks win on a conflicting day. Review conflicts manually; no source identity is upgraded.", "muted"));
        const resumeLabel = el("label", void 0, "backup-resume"), resume = el("input");
        resume.type = "checkbox";
        resume.checked = false;
        resume.disabled = !incoming.resume || local.remember_position === false;
        resumeLabel.append(resume, document.createTextNode("Restore incoming reading position"));
        preview.append(resumeLabel);
        if (local.remember_position === false) preview.append(el("p", "Remember reading position is off. Restoring a position is disabled; your privacy preference will not change.", "muted"));
        if (incoming.resume) {
          preview.append(link("Open incoming reading position", incoming.resume), el("p", "Opening is your choice. Source-pinned positions are checked by the reader before displaying wording. Restoring does not open a passage.", "muted"));
          if (!new URLSearchParams(incoming.resume.slice(6)).has("source")) preview.append(el("p", "Legacy reading position: its source revision was not recorded. It stays unpinned and is not upgraded.", "notice"));
        }
        let applying = false, applied = false;
        const apply = button("Apply study backup", () => {
          if (!active(request2) || applying || applied) return;
          try {
            if (personalState() !== state) throw Error("Personal study data changed since preview. Choose the file again. Nothing was restored.");
            const currentRaw = storageNow();
            if (currentRaw !== raw && !readingPointerOnlyChange(raw, currentRaw)) throw Error("Browser data changed since preview. Nothing was restored.");
            if (resume.checked && (currentRaw !== raw || Object.hasOwn(local, "last") !== localLastPresent || local.last !== localLast)) throw Error("The reading position changed since preview. Preview the file again before restoring its position.");
            if (resume.checked && (local.remember_position === false || !incoming.resume)) throw Error("Restoring the reading position is no longer available.");
            const beforeSaved = local.saved, beforeProgress = local.reading_progress, beforeLastPresent = Object.hasOwn(local, "last"), beforeLast = local.last, beforeStorageSnapshot = storageSnapshot;
            applying = true;
            apply.disabled = true;
            local.saved = merged.saved;
            local.reading_progress = merged.progress;
            if (resume.checked) {
              local.last = incoming.resume;
              storageSnapshot = currentRaw;
            }
            if (!persist()) {
              local.saved = beforeSaved;
              local.reading_progress = beforeProgress;
              storageSnapshot = beforeStorageSnapshot;
              if (beforeLastPresent) local.last = beforeLast;
              else delete local.last;
              updateResume();
              throw Error("The study backup was not confirmed saved. This tab\u2019s original study data and drafts remain available. Keep the file and export your data before reloading. " + storageWarning());
            }
            applied = true;
            resume.disabled = true;
            updateResume();
            const done = el("h3", "Study backup restored in this browser");
            done.tabIndex = -1;
            preview.append(done, el("p", "Existing personal data and preferences were kept. No passage was opened."));
            done.focus();
          } catch (error) {
            preview.append(el("p", error.message, "notice"));
            status2.textContent = storageConflict || !storageOK ? storageWarning() : error.message;
          } finally {
            applying = false;
            apply.disabled = applied;
          }
        });
        preview.append(apply, button("Cancel restore", cancel));
        title.focus();
      } catch (error) {
        failure2(error, request2, incoming.progress.length ? () => prepare(incoming, ++generation, filename) : null, filename);
      }
    }
    input.addEventListener("change", async () => {
      const request2 = ++generation, file = input.files?.[0];
      input.value = "";
      preview.replaceChildren();
      if (!file) return;
      try {
        if (file.size > MAX_STUDY_BACKUP_BYTES) throw Error("Choose a study backup no larger than 32 MiB. Nothing was restored.");
        const text5 = await file.text();
        if (!active(request2)) return;
        if (new TextEncoder().encode(text5).length > MAX_STUDY_BACKUP_BYTES) throw Error("Choose a study backup no larger than 32 MiB. Nothing was restored.");
        const incoming = parseStudyBackup(text5);
        await prepare(incoming, request2, file.name);
      } catch (error) {
        failure2(error, request2, null, file.name);
      }
    });
  }
  async function plans(args, token) {
    const name = args.get("name");
    if (!name) {
      const catalog = planCatalog(await tool("reading_plan", {}));
      if (token !== epoch) return;
      heading("AT YOUR OWN PACE", "Reading plans");
      view.append(link("Study backup", "#backup", "button"));
      view.append(el("p", "Follow the existing sourced reading orders. Day numbers are steps, not deadlines. Marks record your choice only; they do not prove comprehension or completion of every passage.", "notice"));
      const cards = el("div", void 0, "cards"), counts = /* @__PURE__ */ new Map();
      for (const plan of catalog) {
        const card = link("", route("plans", { name: plan.name, day: 1 }), "entry");
        card.append(el("strong", plan.title), el("p", plan.description), el("small", plan.days + " days \xB7 " + local.reading_progress.filter((x) => x.name === plan.name).length + " saved day marks"));
        counts.set(plan.name, card.querySelector("small"));
        cards.append(card);
      }
      view.append(cards);
      const updateCounts = () => {
        for (const plan of catalog) counts.get(plan.name).textContent = plan.days + " days \xB7 " + local.reading_progress.filter((x) => x.name === plan.name).length + " saved day marks";
      };
      view.append(progressImporter(catalog, token, updateCounts));
      view.append(el("p", "Progress stays in this browser only. A changed assignment or source revision requires review; saved marks are not automatically transferred.", "muted"), button("Export reading progress", () => exportPersonal({ format: "pali-library-reading-progress-v1", progress: local.reading_progress }, "pali-library-reading-progress.json")));
      return;
    }
    const day = Number(args.get("day") || 1), data = planDay(await tool("reading_plan", { name, day }), name, day);
    if (token !== epoch) return;
    heading("SOURCED READING ORDER", data.title);
    view.append(link("\u2190 All reading plans", "#plans", "button"), el("p", data.description, "muted"), el("h3", "Day " + day + " of " + data.days));
    const form = el("form");
    form.className = "plan-picker";
    const label = el("label", "Go to day"), input = el("input");
    input.type = "number";
    input.min = "1";
    input.max = String(data.days);
    input.value = day;
    input.required = true;
    label.append(input);
    const submit = el("button", "Go");
    submit.type = "submit";
    form.append(label, submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.reportValidity()) location.hash = route("plans", { name, day: input.value });
    });
    view.append(form);
    for (const reading of data.readings) {
      const card = el("article", void 0, "entry");
      card.append(el("h4", reading.citation + (reading.title ? " \xB7 " + reading.title : "")));
      if (reading.part) card.append(el("p", "Part " + reading.part + " of " + reading.of + " \xB7 assigned P\u0101li segments " + ((reading.get_text.offset || 0) + 1) + "\u2013" + ((reading.get_text.offset || 0) + reading.get_text.limit), "notice"));
      notes(reading, card);
      card.append(link("Read assigned P\u0101li \xB7 " + reading.citation, route("read", { uid: reading.id, plan: name, day, ...reading.get_text.offset !== void 0 ? { offset: reading.get_text.offset } : {} }), "button"));
      if (reading.guide_link?.url) card.append(el("p", "The guide\u2019s cited English source (external; its own scope and terms apply):"), external(reading.guide_link.reference || "Publisher\u2019s source page", reading.guide_link.url));
      view.append(card);
    }
    const signature = daySignature(data), prior = local.reading_progress.find((x) => x.name === name && x.day === day), active = prior?.signature === signature;
    if (prior && !active) view.append(el("p", "This day was marked against a different assignment or source revision. Review it before marking the current day.", "notice"));
    const mark = button(active ? "Day marked \u2713 \xB7 undo" : "Mark this day read", () => {
      const current = local.reading_progress.find((x) => x.name === name && x.day === day), undo = current?.signature === signature;
      local.reading_progress = local.reading_progress.filter((x) => !(x.name === name && x.day === day));
      if (!undo) local.reading_progress.push({ name, day, signature });
      const saved2 = persist();
      mark.textContent = undo ? "Mark this day read" : "Day marked \u2713 \xB7 undo";
      mark.setAttribute("aria-pressed", String(!undo));
      status2.textContent = saved2 ? undo ? "Day mark removed from this browser." : "Day marked in this browser only." : storageWarning();
    });
    mark.setAttribute("aria-pressed", String(active));
    view.append(mark);
    const daysNav = el("nav", void 0, "pager");
    daysNav.setAttribute("aria-label", "Plan days");
    if (day > 1) daysNav.append(link("\u2190 Previous day", route("plans", { name, day: day - 1 }), "button"));
    if (day < data.days) daysNav.append(link("Next day \u2192", route("plans", { name, day: day + 1 }), "button"));
    view.append(daysNav);
    if (data.guide) {
      const guide = el("section", void 0, "provenance");
      guide.append(el("h3", "Study guide \xB7 links only"), el("p", data.guide.cite), el("p", [data.guide.copyright, data.guide.license].filter(Boolean).join(" \xB7 ")), el("p", data.guide.note), external("Read the original study guide", data.guide.url));
      view.append(guide);
      if (data.omitted?.length) {
        const omitted = el("details");
        omitted.append(el("summary", "Unplaced guide links (" + data.omitted.length + ")"));
        for (const item of data.omitted) omitted.append(el("p", item.reason), external("Original unplaced source link", item.url));
        view.append(omitted);
      }
    }
    provenance({ source: data.source.pali });
  }
  function studyIndexNav() {
    const nav = el("nav", void 0, "toolbar");
    nav.setAttribute("aria-label", "Study indexes");
    nav.append(link("All topics", "#topics", "button"), link("Numbered teaching lists", "#lists", "button"), link("Back to library", "#browse?node=canon", "button"));
    view.append(nav);
  }
  function topicProvenance(data) {
    provenance({ source: { ...data.source, terms: data.source.license }, url: data.source.url });
  }
  function studySourceCards(items) {
    const cards = el("div", void 0, "cards");
    for (const item of items) {
      const card = el("article", void 0, "entry");
      card.append(el("h4", item.citation + (item.title ? " \xB7 " + item.title : "")));
      if (item.pts) card.append(el("p", "PTS: " + item.pts, "muted"));
      if (item.numbering_note) card.append(el("p", item.numbering_note, "notice"));
      notes(item, card);
      if (item.role) card.append(el("p", item.role, "muted"));
      card.append(link("Read P\u0101li \xB7 " + item.citation, route("read", { uid: item.id }), "button"));
      if (item.ati_url) card.append(el("p", "Publisher citation: " + item.ati_reference), external("ATI linked page \xB7 separate source terms", item.ati_url));
      cards.append(card);
    }
    view.append(cards);
  }
  async function topics(args, token) {
    const query = (args.get("q") || "").trim(), index = args.get("index") || "all", offset = offsetOf(args), limit = 24;
    if (!["all", "subject", "numerical"].includes(index)) throw Error("Choose a supported topic index.");
    const data = topicCatalogue(await tool("list_topics", { ...query ? { query } : {}, index, offset, limit }), { offset, limit });
    if (token !== epoch) return;
    heading("EDITORIAL INDEX \xB7 NOT SCRIPTURE", "Study by topic", "Study by topic");
    studyIndexNav();
    view.append(el("p", "Explore Access to Insight\u2019s subject and numerical indexes, mapped to bundled canonical texts. Index entries are editorial groupings, not a ruling on what a passage means. English documents have their own terms; no translation is fetched automatically.", "notice"));
    const form = el("form");
    form.className = "topic-picker";
    const label = el("label", "Find a topic"), input = el("input"), filterLabel = el("label", "Topic index"), filter = el("select"), submit = el("button", "Find topics");
    input.value = query;
    input.maxLength = 200;
    label.append(input);
    for (const [value, text5] of [["all", "All entries"], ["subject", "Subject index"], ["numerical", "Numerical index"]]) {
      const option = el("option", text5);
      option.value = value;
      filter.append(option);
    }
    filter.value = index;
    filter.id = "topic-index";
    filterLabel.htmlFor = filter.id;
    const filterField = el("div", void 0, "topic-filter");
    filterField.append(filterLabel, filter);
    submit.type = "submit";
    form.append(label, filterField, submit);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      navigateFromFinder(route("topics", { ...input.value.trim() ? { q: input.value.trim() } : {}, index: filter.value }));
    });
    view.append(form);
    notes(data);
    view.append(el("p", data.total + " matching index entries \xB7 this page: " + data.returned, "muted"));
    const cards = el("div", void 0, "cards");
    for (const item of data.topics) {
      const card = link("", route("topic", { name: item.slug }), "entry");
      card.append(el("strong", item.name), el("small", (item.index === "subject" ? "Subject index" : "Numerical index") + " \xB7 " + item.texts + " mapped texts"));
      cards.append(card);
    }
    view.append(cards);
    if (!data.topics.length) view.append(el("p", "No index entry matched. Try a shorter topic name, P\u0101li term or the text search."));
    pageControls(data.next_offset, offset ? Math.max(0, offset - limit) : null, (n) => route("topics", { ...query ? { q: query } : {}, index, offset: n }));
    topicProvenance(data);
  }
  async function topicPage(args, token) {
    const name = args.get("name"), data = topicDetail(await tool("topic", { name }), name);
    if (token !== epoch) return;
    heading("EDITORIAL TOPIC \xB7 NOT SCRIPTURE", data.topic.name);
    studyIndexNav();
    notes(data);
    view.append(el("p", data.topic.index, "muted"), el("p", data.note, "notice"), external("Original ATI index entry", data.topic.ati_url));
    if (data.dhamma_list) view.append(el("p", "Related numbered list:", "muted"), link(data.dhamma_list.name, route("lists", { name: data.dhamma_list.slug }), "button"));
    view.append(el("h3", "Mapped canonical readings"));
    if (!data.texts.length) view.append(el("p", "No safely mapped canonical link is recorded for this entry. Read the original index; no text was inferred."));
    studySourceCards(data.texts);
    if (data.see_also?.length) {
      view.append(el("h3", "See also \xB7 index cross-references"));
      for (const item of data.see_also) {
        const p = el("p");
        p.append(link(item.name, route("topic", { name: item.slug })));
        view.append(p);
      }
    }
    if (data.further_reading?.length) {
      view.append(el("h3", "External publisher links"));
      for (const item of data.further_reading) {
        const card = el("article", void 0, "entry");
        card.append(external(item.title, item.url), el("p", item.kind, "muted"));
        view.append(card);
      }
    }
    if (data.other_matches?.length) {
      const more = el("details");
      more.append(el("summary", "Other matching index entries"));
      for (const item of data.other_matches) {
        const p = el("p");
        p.append(link(item.name, route("topic", { name: item.slug })));
        more.append(p);
      }
      view.append(more);
    }
    topicProvenance(data);
  }
  async function teachingLists(args, token) {
    const name = args.get("name");
    if (!name) {
      const data2 = listCatalogue(await tool("dhamma_list", {}));
      if (token !== epoch) return;
      heading("CURATED REFERENCE \xB7 NOT SCRIPTURE", "Numbered teaching lists");
      studyIndexNav();
      view.append(el("p", "P\u0101li member names and short English labels lead to their defining passages. A later collective name or a later list is explicitly labelled. Read the source passage before quoting.", "notice"));
      const cards = el("div", void 0, "cards");
      for (const item of data2.lists) {
        const card = link("", route("lists", { name: item.slug }), "entry");
        card.append(el("strong", item.name), el("p", item.pali), el("small", item.status + " \xB7 " + data2.status_labels[item.status]));
        cards.append(card);
      }
      view.append(cards);
      return;
    }
    const data = listDetail(await tool("dhamma_list", { name }), name);
    if (token !== epoch) return;
    heading("CURATED TEACHING LIST \xB7 READ THE SOURCE", data.name);
    studyIndexNav();
    notes(data);
    view.append(el("p", data.pali, "passage"), el("p", data.status + " \xB7 " + data.status_meaning + (data.status_note ? "\n" + data.status_note : ""), "notice"), el("p", data.gloss_note, "notice"));
    if (data.count !== data.members.length) view.append(el("p", "Traditional count: " + data.count + ". The source groups this list into " + data.members.length + " entries below; these rows are not a new enumeration.", "muted"));
    const members = el("ol");
    members.className = "teaching-members";
    for (const member of data.members) {
      const item = el("li"), pali2 = el("strong", member.pali);
      pali2.lang = "pi";
      item.append(pali2, el("p", member.gloss));
      if (member.group) item.append(el("p", member.group, "muted"));
      if (member.list) item.append(link("Open group \xB7 " + member.gloss, route("lists", { name: member.list }), "button"));
      members.append(item);
    }
    view.append(members, el("h3", "Defining canonical passages"), el("p", data.note, "muted"));
    studySourceCards(data.defined_in);
    if (data.see_also_texts?.length) {
      view.append(el("h3", "Additional source context"));
      studySourceCards(data.see_also_texts);
    }
    if (data.related_lists?.length) {
      view.append(el("h3", "Related curated lists"));
      for (const item of data.related_lists) {
        const p = el("p");
        p.append(link(item.name, route("lists", { name: item.slug })));
        view.append(p);
      }
    }
    if (data.topic) view.append(link("ATI index topic \xB7 " + data.topic.name, route("topic", { name: data.topic.slug }), "button"));
    view.append(el("p", "Curated by: " + data.source.curated_by, "muted"));
    provenance({ source: data.source.pali });
  }
  function progressImporter(catalog, token, updateCounts) {
    const section = el("section"), label = el("label", "Restore reading progress from JSON"), input = el("input"), preview = el("div");
    section.setAttribute("aria-label", "Restore reading progress");
    input.type = "file";
    input.accept = ".json,application/json";
    label.append(input);
    preview.className = "import-preview";
    section.append(label, el("p", "Choose your exported plan marks. The file stays on this device. Preview before adding marks; existing days and source signatures are kept. Maximum 16 MiB and 1,600 marks.", "muted"), preview);
    let generation = 0;
    const failure2 = (error) => {
      const title = el("h3", "Unable to restore reading progress");
      title.tabIndex = -1;
      preview.replaceChildren(title, el("p", error.message, "notice"));
      title.focus();
    };
    input.addEventListener("change", async () => {
      const request2 = ++generation, file = input.files?.[0];
      input.value = "";
      preview.replaceChildren();
      if (!file) return;
      try {
        if (file.size > MAX_PROGRESS_BYTES) throw Error("Choose a progress export no larger than 16 MiB. Nothing was restored.");
        const text5 = await file.text();
        if (request2 !== generation || token !== epoch) return;
        if (new TextEncoder().encode(text5).length > MAX_PROGRESS_BYTES) throw Error("Choose a progress export no larger than 16 MiB. Nothing was restored.");
        let snapshot;
        try {
          snapshot = localStorage.getItem(KEY);
        } catch {
        }
        if (snapshot !== void 0 && snapshot !== storageSnapshot && !readingPointerOnlyChange(storageSnapshot, snapshot)) throw Error("Browser data changed in another tab. Reload this page before restoring; no marks were restored.");
        const incoming = parseProgress(text5, catalog), merge = mergeProgress(local.reading_progress, incoming), title = el("h3", "Review reading progress");
        title.tabIndex = -1;
        preview.replaceChildren(title, el("p", file.name), el("p", merge.added + " new marks \xB7 " + merge.duplicates + " already saved \xB7 " + merge.conflicts + " conflicting days kept as they are.", "notice"), el("p", "Imported marks are self-reported. Their saved assignments and source revisions are retained, not verified against every current plan day. Open a day to check whether its mark still applies.", "muted"));
        if (merge.added) preview.append(button("Add " + merge.added + " reading marks", () => {
          if (request2 !== generation || token !== epoch) return;
          try {
            if (snapshot !== void 0) {
              const currentRaw = localStorage.getItem(KEY);
              if (currentRaw !== snapshot && !readingPointerOnlyChange(snapshot, currentRaw)) throw Error("Browser data changed while previewing this file. Reload this page and preview again; no marks were restored.");
            }
            const current = mergeProgress(local.reading_progress, incoming);
            local.reading_progress = current.progress;
            const durable = persist();
            updateCounts();
            const done = el("h3", "Reading marks restored");
            done.tabIndex = -1;
            preview.replaceChildren(done, el("p", current.added + " new marks added. Existing marks kept. Open a plan day to review its current source and assignment.", "notice"));
            status2.textContent = durable ? "Reading marks restored in this browser only." : storageWarning();
            done.focus();
          } catch (error) {
            failure2(error);
          }
        }));
        else preview.append(el("p", "No new marks to add."));
        preview.append(button("Cancel progress import", () => {
          ++generation;
          preview.replaceChildren();
          input.focus();
        }));
        title.focus();
      } catch (error) {
        if (request2 === generation && token === epoch) failure2(error);
      }
    });
    return section;
  }
  function quoteChecker(token) {
    heading("CHECK AGAINST SOURCE TEXT", "Check a P\u0101li quotation");
    view.append(el("p", "P\u0101li only \xB7 Roman or a supported P\u0101li script \xB7 up to 2,000 characters and 120 comparison words. English checking is not offered here; no translations are fetched.", "notice"), el("p", "Your quotation is sent to this server for matching, but is not put in the URL, browser storage or page title. Hosting infrastructure may keep request logs. A match does not establish authorship or exact spelling.", "muted"));
    const form = el("form"), label = el("label", "P\u0101li quotation"), input = el("textarea"), submit = el("button", "Check bundled P\u0101li"), result = el("section");
    input.id = "quote-input";
    input.className = "note-field";
    input.minLength = 8;
    input.maxLength = 2e3;
    input.required = true;
    input.spellcheck = false;
    label.htmlFor = input.id;
    submit.type = "submit";
    form.append(label, input, submit);
    result.id = "quote-result";
    result.tabIndex = -1;
    result.setAttribute("aria-label", "Quotation comparison result");
    view.append(form, result);
    let generation = 0;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const request2 = ++generation, quote = input.value.trim();
      result.replaceChildren(el("p", "Comparing with bundled canonical P\u0101li\u2026"));
      result.setAttribute("aria-busy", "true");
      submit.disabled = true;
      try {
        const data = await tool("verify_quote", { text: quote, language: "pali", limit: 5 });
        if (token !== epoch || request2 !== generation) return;
        validatePaliQuote(data, quote);
        const labels = { found: "Matching wording found", close_paraphrase: "Similar wording found", not_found_in_scope: "Not found in the searched scope" };
        result.replaceChildren(el("h3", labels[data.verdict]), el("p", "Submitted quotation", "muted"), el("p", quote, "translation"), el("p", data.explanation, "notice"), el("p", data.scope.searched), el("p", data.comparison.note), el("p", data.guidance, "muted"));
        notes(data, result);
        if (data.citation_note) result.append(el("p", data.citation_note, "notice"));
        if (data.verdict === "not_found_in_scope" && data.matches.length) result.append(el("h4", "Lower-scoring candidates \xB7 not verified matches"));
        for (const match of data.matches) {
          const card = el("article", void 0, "word-card");
          card.append(el("h4", match.citation + (match.title ? " \xB7 " + match.title : "")), el("p", match.matched_text, "passage"), el("p", "Source span: " + match.source_span.first_segment_ref + " to " + match.source_span.last_segment_ref, "muted"));
          if (match.matched_text_truncated) card.append(el("p", "Excerpt shortened by the source tool. Open the source for the complete context.", "notice"));
          card.append(el("p", data.comparison.method === "literal_source_substring" ? "Unchanged source substring located; source correctness and authorship are not established." : "Normalized similarity: " + match.similarity + " (0\u20131), not a probability of truth or authorship.", "muted"));
          card.querySelector(".passage").lang = "pi";
          notes(match, card);
          card.append(link("Open source at match start \xB7 " + match.citation, route("read", { uid: match.text_id, offset: match.read_with.offset, ref: match.segment_ref }), "button"));
          result.append(card);
        }
        result.append(el("p", data.thresholds.measure, "muted"));
        provenance({ edition: "Bundled canonical P\u0101li comparison", attribution: data.scope.attribution, license: data.scope.terms }, result);
        result.focus({ preventScroll: true });
        result.scrollIntoView({ block: "start" });
      } catch (error) {
        if (token !== epoch || request2 !== generation) return;
        result.replaceChildren(el("h3", "Unable to check this quotation"), el("p", error.message, "notice"));
        result.focus({ preventScroll: true });
      } finally {
        if (token === epoch && request2 === generation) {
          submit.disabled = false;
          result.removeAttribute("aria-busy");
        }
      }
    });
  }
  function bookmarkImporter() {
    const token = epoch, section = el("section");
    section.setAttribute("aria-label", "Restore bookmark export");
    const label = el("label", "Restore bookmarks and notes from a JSON export"), input = el("input");
    input.type = "file";
    input.accept = ".json,application/json";
    label.append(input);
    section.append(label, el("p", "Files stay on this device. Preview first; existing bookmarks and notes are kept. References are checked against the source only when opened. Maximum file size: 16 MiB.", "muted"));
    const preview = el("div");
    preview.className = "import-preview";
    preview.setAttribute("aria-live", "polite");
    section.append(preview);
    let generation = 0;
    input.addEventListener("change", async () => {
      const file = input.files[0], request2 = ++generation;
      input.value = "";
      if (!file) return;
      preview.replaceChildren(el("p", "Reading the local export\u2026"));
      try {
        if (file.size > MAX_IMPORT_BYTES) throw Error("This file exceeds 16 MiB. Nothing was imported.");
        const incoming = parseBookmarks(await file.text());
        if (request2 !== generation || token !== epoch) return;
        const merge = bookmarkMerge(local.saved, incoming), title = el("h3", "Review bookmark import");
        title.tabIndex = -1;
        preview.replaceChildren(title, el("p", file.name), el("p", merge.added.length + " new bookmarks \xB7 " + merge.skipped + " already saved. Existing notes will not be overwritten.", "notice"));
        if (merge.added.length) {
          const list = el("ul");
          for (const item of merge.added.slice(0, 10)) list.append(el("li", item.title + " \xB7 " + item.ref));
          preview.append(list);
          if (merge.added.length > 10) preview.append(el("p", "And " + (merge.added.length - 10) + " more."));
          preview.append(button("Add " + merge.added.length + " new bookmarks", () => {
            if (token !== epoch || request2 !== generation) return;
            try {
              const current = bookmarkMerge(local.saved, incoming);
              local.saved = current.saved;
              const durable = persist();
              saved();
              status2.textContent = durable ? current.added.length + " bookmarks restored in this browser. Existing notes kept." : storageWarning();
            } catch (error) {
              preview.replaceChildren(el("p", error.message, "notice"));
            }
          }));
        } else preview.append(el("p", "There are no new passages to add."));
        preview.append(button("Cancel import", () => {
          ++generation;
          preview.replaceChildren();
          input.focus();
        }));
        title.focus();
      } catch (error) {
        if (request2 === generation && token === epoch) preview.replaceChildren(el("p", error.message, "notice"));
      }
    });
    return section;
  }
  var savedFilters = { query: "", scope: "all", page: 0 };
  function saved() {
    const token = epoch;
    view.replaceChildren();
    heading("YOUR PERSONAL READING", "Saved passages");
    view.append(el("p", "Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.", "notice"));
    view.append(link("Study backup", "#backup", "button"));
    view.append(button("Export bookmarks and notes", () => {
      exportPersonal(exportBookmarks(), "pali-library-bookmarks.json");
    }));
    view.append(el("p", "Unsaved note edits stay in this tab while you navigate. Save or export them before closing or reloading.", "muted"), bookmarkImporter());
    const filters = el("form", void 0, "saved-filters");
    filters.setAttribute("aria-label", "Find saved passages");
    const searchLabel = el("label", "Search saved passages and notes"), query = el("input");
    query.type = "search";
    query.maxLength = 300;
    query.value = savedFilters.query;
    searchLabel.append(query);
    const scopeLabel = el("label", "Saved source type"), scope = el("select");
    scope.setAttribute("aria-label", "Saved source type");
    for (const [value, name] of [["all", "All source types"], ...Object.entries(savedScopeLabels)]) {
      const option = el("option", name);
      option.value = value;
      scope.append(option);
    }
    scope.value = savedFilters.scope;
    scopeLabel.append(scope);
    const clear = button("Clear saved filters", () => {
      if (token !== epoch) return;
      query.value = "";
      scope.value = "all";
      refresh();
      query.focus();
    });
    filters.append(searchLabel, scopeLabel, clear);
    view.append(filters, el("p", "Search stays in this tab. It checks saved titles, references and personal notes, not the full scripture text.", "muted"));
    const count2 = el("p");
    count2.id = "saved-count";
    count2.setAttribute("role", "status");
    count2.setAttribute("aria-live", "polite");
    count2.tabIndex = -1;
    view.append(count2);
    const results = el("section");
    results.setAttribute("aria-label", "Saved passage results");
    view.append(results);
    function refresh() {
      if (token !== epoch) return;
      savedFilters.query = query.value;
      savedFilters.scope = scope.value;
      savedFilters.page = 0;
      show();
    }
    filters.addEventListener("submit", (event) => {
      event.preventDefault();
      refresh();
    });
    query.addEventListener("input", refresh);
    scope.addEventListener("change", refresh);
    function show(moveFocus = false) {
      if (token !== epoch) return;
      const page = savedPage(local.saved, noteDrafts, savedFilters);
      savedFilters.page = page.page;
      count2.textContent = page.total ? `Showing ${page.start}\u2013${page.end} of ${page.total} matching saved passages \xB7 ${page.all} saved in this tab` : `No matching saved passages \xB7 ${page.all} saved in this tab`;
      results.replaceChildren();
      if (!local.saved.length) results.append(el("p", "Save a passage while reading to find it here."));
      else if (!page.total) results.append(el("p", "Try a different saved title, reference, note or source type, or clear the filters."));
      for (const item of page.items) {
        const box = el("article", void 0, "segment");
        box.append(el("small", savedScopeLabels[savedScope(item)], "muted"));
        try {
          const target = bookmarkLocation(item, readingArgs(item.uid));
          box.append(link(item.title + " \xB7 " + item.ref, target.href), el("p", target.notice, "muted"));
        } catch (error) {
          box.append(el("strong", item.title + " \xB7 " + item.ref), el("p", "This saved reference cannot be opened safely: " + error.message, "notice"));
        }
        box.append(personalNoteEditor(item, { uid: item.uid, ref: item.ref }, token, { mode: "saved" }));
        const remove = button("Remove bookmark", () => removePersonalBookmark(savedRecord(item) || item, token, box, remove, () => show(true)));
        box.append(remove);
        if (item.source_commit) box.append(el("small", "Saved source revision: " + item.source_commit, "muted"));
        results.append(box);
      }
      if (page.pages > 1) {
        const pager = el("nav", void 0, "pager");
        pager.setAttribute("aria-label", "Saved passage pages");
        if (page.page > 0) pager.append(button("Previous saved page", () => {
          if (token !== epoch) return;
          savedFilters.page = page.page - 1;
          show(true);
        }));
        pager.append(el("span", `Page ${page.page + 1} of ${page.pages}`));
        if (page.page + 1 < page.pages) pager.append(button("Next saved page", () => {
          if (token !== epoch) return;
          savedFilters.page = page.page + 1;
          show(true);
        }));
        results.append(pager);
      }
      if (moveFocus) {
        count2.focus({ preventScroll: true });
        count2.scrollIntoView({ block: "start" });
      }
    }
    show();
  }
  function about() {
    heading("A LIBRARY, NOT A TEACHER", "Read with the source in view.");
    for (const text5 of ["The bundled P\u0101li is retrieved from the VRI Cha\u1E6D\u1E6Dha Sa\u1E45g\u0101yana edition. Scripture is never generated or reconstructed. Abbreviations and uncertain alignments stay labelled.", "English translations are available for a subset of texts and fetched only after you choose them. Translators\u2019 wording is not silently exchanged. Commentary is labelled separately from canonical text.", "VRI and several translation/dictionary sources carry non-commercial terms. This reading interface adds no permission to redistribute, translate or commercialize their work.", "Your saved passages, notes, manual reading-plan marks and preferences are stored in this browser. The app has no accounts, advertising, analytics, cloud sync or offline web download. The server may hold your IP temporarily for rate limiting; deployment providers may keep separate infrastructure logs."]) view.append(el("p", text5));
    const links = el("div", void 0, "toolbar");
    links.append(external("Source and licence register", "https://github.com/DaniilKi/pali-canon-claude/blob/dev/pali-reliability/THIRD_PARTY.md"), external("Project and complete MCP toolset", "https://github.com/DaniilKi/pali-canon-claude"));
    view.append(links);
  }
  async function render() {
    if (location.hash === "#content" && view.childElementCount) {
      $("content").focus();
      return;
    }
    activePosition = null;
    highlightTargets = [];
    clearTimeout(positionTimer);
    const token = ++epoch;
    ++studyEpoch;
    requests.cancelAll();
    closeFinder();
    updateResume();
    view.replaceChildren();
    status2.textContent = "Opening the library\u2026";
    const hash = location.hash.slice(1), queryIndex = hash.indexOf("?"), page = queryIndex < 0 ? hash : hash.slice(0, queryIndex), args = new URLSearchParams(queryIndex < 0 ? "" : hash.slice(queryIndex + 1));
    try {
      if (page === "read") await read(args, token);
      else if (page === "search") await search(args, token);
      else if (page === "glossary") await dictionary(args, token);
      else if (page === "daily") await daily(args, token);
      else if (page === "verify") quoteChecker(token);
      else if (page === "plans") await plans(args, token);
      else if (page === "topics") await topics(args, token);
      else if (page === "topic") await topicPage(args, token);
      else if (page === "lists") await teachingLists(args, token);
      else if (page === "saved") saved();
      else if (page === "backup") studyBackup(token);
      else if (page === "about") about();
      else await browse(args, token);
      if (token !== epoch) return;
      status2.textContent = storageConflict || !storageOK ? storageWarning() : !positionDurable ? positionWarning || storageWarning() : "";
      focusHeading();
    } catch (error) {
      if (token !== epoch) return;
      view.replaceChildren();
      const stopped2 = error.code === "REQUEST_STOPPED";
      heading(stopped2 ? "BROWSER WAIT STOPPED" : "UNABLE TO OPEN", stopped2 ? "Reading request stopped" : "No passage was substituted.");
      view.append(el("p", error.message, "notice"), button("Try again", render), link("Browse the library", route("browse", { node: "canon" }), "button"));
      if (error.code === "READING_SOURCE_CHANGED") {
        const review = new URLSearchParams(args);
        review.delete("source");
        review.delete("page_source");
        view.append(link(args.has("page_source") ? "Review current source at this position" : "Review current source at this reference", "#read?" + review, "button"));
      }
      status2.textContent = stopped2 ? "Stopped waiting in this browser." : error.code === "REQUEST_DEADLINE" ? "The request timed out." : "The request failed.";
    }
  }
  installPagePrinting();
  window.addEventListener("hashchange", render);
  render();
})();
