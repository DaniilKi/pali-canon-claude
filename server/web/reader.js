(() => {
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
    const key = String(name ?? "").trim().toLowerCase();
    const found = ALIASES[key];
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
  function fromRoman(text3, script, stanza) {
    const t = TABLES[script];
    const s = romanPunctuation(text3.normalize("NFC"), t, stanza).toLowerCase();
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
  function toRomanFrom(text3, script) {
    const R = reverse(script);
    const { t } = R;
    let s = text3.normalize("NFC").replace(/[\u200c\u200d]/g, "");
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
  function detectScript(text3) {
    const counts = {};
    for (const ch of String(text3 ?? "")) {
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
  function transliterate(text3, from, to, { stanza = false } = {}) {
    if (text3 == null) return text3;
    const s = String(text3);
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
  var pali = (text3, script, opts) => typeof text3 === "string" && text3 ? transliterate(text3, "roman", script, opts) : text3;
  function verse(text3, script) {
    const lines = text3.split("\n");
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
  var own = (value, key) => value && Object.hasOwn(value, key);
  var nonempty = (value) => typeof value === "string" && value.trim().length > 0;
  var sha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  var stable = (value) => JSON.stringify(Array.isArray(value) ? value.map((v) => JSON.parse(stable(v))) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, JSON.parse(stable(value[k]))])) : value);
  var sameScope = (a, b) => stable(a) === stable(b);
  function scopeDescriptor(choice, requestedId) {
    if (!own(choice, "translation_scope")) return null;
    const scope = choice.translation_scope;
    const fail = () => {
      throw new Error("This source has an unsupported or incomplete scope declaration. No scoped source was requested. Reload the passage and review the updated sources.");
    };
    if (!scope || scope.version !== 1 || scope.whole_unit_coverage !== false || !sha(scope.scope_sha256) || !sha(scope.text_sha256) || !sha(scope.pali_sha256) || !nonempty(scope.source_commit) || !nonempty(scope.note) || !nonempty(choice.translation_id)) fail();
    if (scope.kind === "shared_page") {
      const ids = scope.text_ids;
      const presentation = scope.presentation || (scope.condensed === true ? "condensed" : null);
      if (!Array.isArray(ids) || ids.length < 2 || ids.length > 32 || ids.some((id) => !nonempty(id) || id.length > 300) || new Set(ids).size !== ids.length || !ids.includes(requestedId) || scope.owner_id !== ids[0] || scope.individual_alignment_verified !== false || !nonempty(scope.source_reference) || !["condensed", "compilation"].includes(presentation) || presentation === "compilation" && !sha(scope.notice_sha256) || own(scope, "condensed") && scope.condensed !== (presentation === "condensed")) fail();
      return { kind: scope.kind, label: presentation === "compilation" ? "Shared compilation page" : "Shared condensed page", scope: JSON.parse(JSON.stringify(scope)), flags: { allow_shared: true, scope_sha256: scope.scope_sha256 } };
    }
    if (scope.kind === "partial_unit") {
      const prefix = requestedId + "/";
      if (scope.unit_id !== requestedId || !nonempty(scope.first_ref) || !nonempty(scope.last_ref) || !scope.first_ref.startsWith(prefix) || !scope.last_ref.startsWith(prefix) || !/^[1-9]\d*$/.test(scope.first_ref.slice(prefix.length)) || !/^[1-9]\d*$/.test(scope.last_ref.slice(prefix.length)) || Number(scope.first_ref.slice(prefix.length)) > Number(scope.last_ref.slice(prefix.length))) fail();
      return { kind: scope.kind, label: "Partial-unit source", scope: JSON.parse(JSON.stringify(scope)), flags: { allow_partial: true, scope_sha256: scope.scope_sha256 } };
    }
    fail();
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
      const key = x?.name + ":" + x?.day;
      if (!x || !nameOK(x.name) || !Number.isInteger(x.day) || x.day < 1 || x.day > 400 || typeof x.signature !== "string" || x.signature.length > 12e3 || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 1600);
  }
  function planWindow(data, uid, requestedOffset) {
    const reading = data.readings.find((r) => r.id === uid);
    if (!reading) throw Error("This text is not in the selected plan day.");
    const start = reading.get_text.offset ?? 0, end = reading.get_text.limit === void 0 ? null : start + reading.get_text.limit;
    const offset = requestedOffset ?? start;
    if (!Number.isInteger(offset) || offset < start || end !== null && offset >= end) throw Error("This reading position is outside the selected plan day. Return to the plan to open its assigned span.");
    return { start, end, offset, limit: end === null ? 30 : Math.min(30, end - offset) };
  }
  function validatePlanPage(data, plan, uid, window2) {
    if (data.text_id !== uid || data.source?.commit !== plan.source.pali.commit || data.offset !== window2.offset || !Array.isArray(data.segments) || data.returned !== data.segments.length || !data.returned || data.returned > window2.limit || window2.end !== null && data.returned !== window2.limit) throw Error("The P\u0101li response does not match the selected plan span and source revision. No plan passage was displayed.");
  }

  // web/bookmark-import.mjs
  var MAX_IMPORT_BYTES = 16 * 1024 * 1024;
  var keys = /* @__PURE__ */ new Set(["uid", "ref", "title", "note", "offset", "source_commit"]);
  var string = (x, max) => typeof x === "string" && x.length > 0 && x.length <= max && !/[\u0000-\u001f\u007f]/.test(x);
  var object = (x) => x && typeof x === "object" && !Array.isArray(x);
  var identity = (x) => JSON.stringify([x.uid, x.ref]);
  function parseBookmarks(text3) {
    let data;
    try {
      data = JSON.parse(text3);
    } catch {
      throw Error("Choose a valid JSON bookmark export. Nothing was imported.");
    }
    if (!object(data) || data.format !== "pali-library-v1" || Object.keys(data).some((k) => !["format", "saved"].includes(k)) || !Array.isArray(data.saved) || data.saved.length > 500) throw Error("This is not a supported P\u0101li Library bookmark export (maximum 500 passages). Nothing was imported.");
    const seen = /* @__PURE__ */ new Set();
    return data.saved.map((x) => {
      if (!object(x) || Object.keys(x).some((k) => !keys.has(k)) || !string(x.uid, 300) || !string(x.ref, 400) || !string(x.title, 1e3) || !(/^[a-z][a-z0-9.-]*$/.test(x.uid) || /^(book|post|commentary-ref|commentary):[^\r\n]+$/.test(x.uid)) || /https?:|javascript:|data:|[<>]/i.test(x.uid) || x.note !== void 0 && (typeof x.note !== "string" || x.note.length > 4e3) || x.offset !== void 0 && (!Number.isSafeInteger(x.offset) || x.offset < 0 || x.offset > 1e5) || x.source_commit !== void 0 && !string(x.source_commit, 100)) throw Error("A bookmark has unsupported fields or invalid reference, note, position or revision metadata. Nothing was imported.");
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

  // web/reader.js
  var $ = (id) => document.getElementById(id);
  var view = $("view");
  var status = $("status");
  var serial = 0;
  var epoch = 0;
  var studyEpoch = 0;
  var KEY = "pali-library-v1";
  var storageOK = true;
  function loadLocal() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || "{}");
      return x && typeof x === "object" && !Array.isArray(x) ? x : {};
    } catch {
      storageOK = false;
      return {};
    }
  }
  var local = loadLocal();
  local.reading_progress = cleanProgress(local.reading_progress);
  if (!Array.isArray(local.saved)) local.saved = [];
  local.saved = local.saved.filter((x) => x && typeof x.uid === "string" && typeof x.ref === "string" && typeof x.title === "string").slice(0, 500);
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(local));
      return true;
    } catch {
      storageOK = false;
      status.textContent = "Browser storage is unavailable. Changes are kept only in this tab; export your saved passages.";
      return false;
    }
  }
  function el(tag, text3, className) {
    const n = document.createElement(tag);
    if (text3 !== void 0) n.textContent = text3;
    if (className) n.className = className;
    return n;
  }
  function button(text3, fn) {
    const n = el("button", text3);
    n.type = "button";
    n.addEventListener("click", fn);
    return n;
  }
  function link(text3, href, className) {
    const n = el("a", text3, className);
    n.href = href;
    return n;
  }
  function external(text3, url) {
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return el("span", text3);
      return link(text3, u.href);
    } catch {
      return el("span", text3);
    }
  }
  function route(name, args = {}) {
    return "#" + name + "?" + new URLSearchParams(args);
  }
  async function tool(name, args) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 18e4);
    try {
      const response = await fetch("/mcp", { method: "POST", signal: abort.signal, headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++serial, method: "tools/call", params: { name, arguments: args } }) });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many requests. Wait a minute, then try again." : "The text service is unavailable. Try again.");
      const rpc = await response.json();
      if (rpc.error) throw new Error(rpc.error.message);
      const result = rpc.result;
      if (!result) throw new Error("The text service returned an incomplete response.");
      const data = result.structuredContent || JSON.parse(result.content?.find((c) => c.type === "text")?.text || "{}");
      if (result.isError || data.error) throw new Error(data.error || "This selection could not be retrieved.");
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The request timed out. Try again; no replacement passage was selected.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
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
  function heading(eyebrow, title) {
    view.append(el("p", eyebrow, "eyebrow"), el("h2", title));
  }
  function focusHeading() {
    $("content").focus({ preventScroll: true });
  }
  function updateResume() {
    if (typeof local.last === "string" && /^#read\?/.test(local.last)) {
      $("resume").href = local.last;
      $("resume").hidden = false;
    }
  }
  function preferences() {
    const size = Math.max(16, Math.min(30, Number(local.font) || 21));
    document.documentElement.style.setProperty("--reading", size + "px");
    $("font-size").value = size;
    document.body.dataset.theme = local.theme === "dark" ? "dark" : "light";
    $("theme").value = document.body.dataset.theme;
    if ([...$("script").options].some((o) => o.value === local.script)) $("script").value = local.script;
  }
  preferences();
  updateResume();
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
    location.hash = route("search", { q: $("query").value.trim(), scope: $("search-scope").value });
  });
  document.querySelector(".skip").addEventListener("click", (e) => {
    e.preventDefault();
    $("content").focus();
  });
  $("reference-form").addEventListener("submit", (e) => {
    e.preventDefault();
    location.hash = route("read", { uid: $("reference").value.trim() });
  });
  function pageControls(next, previous, action) {
    const p = el("nav", void 0, "pager");
    p.setAttribute("aria-label", "Pagination");
    if (previous !== null) p.append(link("\u2190 Previous page", action(previous), "button"));
    if (next !== null && next !== void 0) p.append(link("Next page \u2192", action(next), "button"));
    view.append(p);
  }
  async function browse(args, token) {
    const node = args.get("node") || "canon", offset = offsetOf(args), limit = 40;
    const kind = node === "commentary" ? "commentary" : node === "post" ? "post" : "canon";
    const data = kind === "commentary" ? await tool("get_commentary", { uid: "commentary", offset, limit }) : kind === "post" ? await tool("get_post_canonical", { offset, limit }) : await tool("browse_canon", { node, offset, limit });
    if (token !== epoch) return;
    heading("EXPLORE THE LIBRARY", kind === "commentary" ? "Traditional commentary" : kind === "post" ? "Later P\u0101li works" : data.name || "The P\u0101li Canon");
    const nav = el("div", void 0, "toolbar");
    nav.append(link("All collections", route("browse", { node: "canon" }), "button"), link("Complete source books", route("browse", { node: "books" }), "button"));
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
    heading(scope === "canon" ? "SEARCH THE CANON" : scope === "commentary" ? "SEARCH COMMENTARY \xB7 NOT CANON" : "SEARCH LATER WORKS \xB7 NOT CANON", "Results for \u201C" + query + "\u201D");
    notes(data);
    if (data.expanded_from_english) view.append(el("p", "English keywords expanded into P\u0101li: " + JSON.stringify(data.expanded_from_english), "notice"));
    const seen = /* @__PURE__ */ new Set(), cards = el("div", void 0, "cards");
    for (const item of [...data.title_matches || [], ...data.results || data.matches || []]) {
      const command = item.read_with || {}, id = scope === "commentary" ? command.uid : scope === "post" ? command.citation : item.id || item.text_id || item.uid;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const a = link("", route("read", { uid: id, ...scope !== "canon" ? { kind: scope } : {}, ...command.offset !== void 0 ? { offset: command.offset } : {}, ...item.segment_ref ? { ref: item.segment_ref } : {} }), "entry");
      a.append(el("small", item.citation || id), el("strong", item.title || item.book?.title || item.citation || id));
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
  function saveSegment(selector, data, segment, control, container) {
    const found = local.saved.findIndex((x) => x.uid === selector && x.ref === segment.ref);
    if (found >= 0) local.saved.splice(found, 1);
    else if (local.saved.length < 500) local.saved.push({ uid: selector, ref: segment.ref, title: data.title || data.book?.title || data.citation || data.book_id, note: "", offset: data.offset + data.segments.indexOf(segment), source_commit: data.source?.commit });
    else {
      status.textContent = "Your saved list is full (500 passages). Export it before removing entries.";
      return;
    }
    const active = local.saved.some((x) => x.uid === selector && x.ref === segment.ref);
    control.textContent = active ? "Saved \u2713" : "Save passage";
    control.setAttribute("aria-pressed", String(active));
    container.classList.toggle("marked", active);
    persist();
  }
  async function read(args, token) {
    const book = args.get("book"), uid = args.get("uid") || "dhp183";
    let offset = offsetOf(args), plan = null, window2 = null;
    if (args.has("plan")) {
      if (book || args.has("kind")) throw Error("Reading plans require their canonical text selection.");
      const name = args.get("plan"), day = Number(args.get("day"));
      plan = planDay(await tool("reading_plan", { name, day }), name, day);
      if (token !== epoch) return;
      window2 = planWindow(plan, uid, args.has("offset") ? Number(args.get("offset")) : void 0);
      offset = window2.offset;
    }
    const kind = book ? "book" : ["commentary", "post"].includes(args.get("kind")) ? args.get("kind") : "canon";
    const request = { ...kind === "book" ? { book } : kind === "post" ? { citation: uid } : { uid }, offset, limit: window2?.limit || 30, script: $("script").value };
    const data = await tool(kind === "commentary" ? "get_commentary" : kind === "post" ? "get_post_canonical" : "get_text", request);
    if (token !== epoch) return;
    if (!Array.isArray(data.segments)) throw new Error("Choose an individual book or passage to read.");
    if (args.has("ref") && !data.segments.some((segment) => segment.ref === args.get("ref"))) throw Error("The saved passage reference was not returned at this position. No nearby passage was substituted. Open the source from the Library or check the bookmark\u2019s revision.");
    if (plan) validatePlanPage(data, plan, uid, window2);
    if (kind === "post" && data.canonical !== false || kind === "commentary" && !(data.canonical === false && data.content_type === "commentary") && !(typeof data.label === "string" && data.label.startsWith("Commentary") && data.label.includes("not the canon"))) throw new Error("This response lacks the expected non-canonical source label.");
    const selector = kind === "book" ? "book:" + book : kind === "post" ? "post:" + uid : kind === "canon" ? data.text_id || uid : uid.startsWith("commentary:") ? uid : "commentary-ref:" + uid;
    heading(kind === "book" ? "COMPLETE VRI SOURCE BOOK" : kind === "commentary" ? "TRADITIONAL COMMENTARY \xB7 NOT CANON" : kind === "post" ? "LATER P\u0100LI WORK \xB7 NOT CANON" : "CANONICAL P\u0100LI", (data.citation ? data.citation + " \xB7 " : "") + (data.title || data.book?.title || data.book_id || uid));
    if (plan) {
      view.append(link("\u2190 Return to plan day " + plan.day, route("plans", { name: plan.name, day: plan.day }), "button"), el("p", plan.title + " \xB7 day " + plan.day + (window2.end === null ? " \xB7 complete selected text" : " \xB7 assigned segments " + (window2.start + 1) + "\u2013" + window2.end) + ". English sources and related material may cover more than this assignment; they are not aligned to this part.", "notice"));
    }
    notes(data);
    view.append(el("p", `Segments ${offset + 1}\u2013${offset + data.returned} of ${data.total_segments}`, "muted"));
    const toolbar = el("div", void 0, "toolbar");
    toolbar.append(link("Back to library", route("browse", { node: "canon" }), "button"));
    if (kind === "canon") {
      toolbar.append(button("English sources", () => translations(data, uid, token)), button("Traditional commentary", () => commentary(uid, token)), button("Related texts", () => relatedTexts(data.text_id || uid, token)));
    }
    toolbar.append(button("Copy reading link", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = "Reading link copied.";
      } catch {
        status.textContent = "Copy the link from your browser\u2019s address bar.";
      }
    }));
    view.append(toolbar);
    const additions = el("section");
    additions.id = "study";
    additions.setAttribute("aria-live", "polite");
    view.append(additions);
    const passages = el("section");
    passages.setAttribute("aria-label", "P\u0101li passage");
    for (const segment of data.segments || []) {
      const part = el("article", void 0, "segment " + (segment.type === "heading" ? "heading" : ""));
      part.id = "seg-" + segment.ref.replace(/[^a-z0-9-]/gi, "-");
      const row = el("div", void 0, "segment-label");
      row.append(el("span", segment.ref + (segment.vri_paragraph ? " \xB7 VRI " + segment.vri_paragraph : "")));
      const active = local.saved.some((x) => x.uid === selector && x.ref === segment.ref);
      const save = button(active ? "Saved \u2713" : "Save passage", () => saveSegment(selector, data, segment, save, part));
      save.setAttribute("aria-label", "Save passage " + segment.ref);
      save.setAttribute("aria-pressed", String(active));
      const actions = el("div", void 0, "segment-actions");
      actions.append(save);
      if (kind !== "commentary" && segment.type !== "heading") {
        const study = button("Study words", () => wordStudy({ ...kind === "book" ? { book } : { uid: kind === "canon" ? data.text_id || uid : uid }, segment: segment.ref, offset: 0, limit: 15 }, { ref: segment.ref, text: segment.text, source: data.source?.commit, script: $("script").value, kind }, token));
        study.setAttribute("aria-label", "Study words in " + segment.ref);
        actions.append(study);
      }
      row.append(actions);
      part.classList.toggle("marked", active);
      const text3 = el("p", segment.text, "passage");
      text3.lang = "pi";
      part.append(row, text3);
      passages.append(part);
    }
    const next = plan && window2.end !== null ? offset + data.returned < window2.end ? offset + data.returned : null : data.next_offset;
    view.append(passages);
    pageControls(next, offset > (window2?.start || 0) ? Math.max(window2?.start || 0, offset - 30) : null, (n) => route("read", { ...readingArgs(selector), offset: n, ...plan ? { plan: plan.name, day: plan.day } : {} }));
    provenance(data);
    local.last = location.hash;
    persist();
    updateResume();
    const savedVersion = local.saved.find((x) => x.uid === selector && x.source_commit && x.source_commit !== data.source?.commit);
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
      for (const id of scope.text_ids) {
        const li = el("li");
        li.append(link(id + " \xB7 canonical P\u0101li", route("read", { uid: id })));
        list.append(li);
      }
      target.append(list);
    } else target.append(el("p", "Declared P\u0101li span: " + scope.first_ref + " to " + scope.last_ref), el("p", "Only this span has a linked translation. The P\u0101li reader below still shows the selected canonical text, not an aligned or shortened English/P\u0101li pair.", "notice"));
    target.append(el("p", scope.note, "notice"));
    const details = el("details");
    details.append(el("summary", "Reviewed scope version"));
    details.append(el("p", "Source revision: " + scope.source_commit), el("p", "Mapping SHA-256: " + scope.scope_sha256));
    target.append(details);
  }
  async function translations(data, uid, token) {
    ++studyEpoch;
    const target = $("study");
    target.replaceChildren(el("h3", "English sources"));
    if (!data.english_available?.length) {
      target.append(el("p", "No verified English source is linked to this text. No translation has been generated or substituted.", "notice"));
      return;
    }
    const context = { uid: data.text_id || uid, citation: data.citation || uid, choices: JSON.parse(JSON.stringify(data.english_available)), accepted: null };
    target.append(el("p", "Choose a publisher\u2019s source page. It can cover more than the current P\u0101li selection; paragraphs are not aligned. Shared and partial sources require a separate scope review before retrieval.", "muted"));
    for (const choice of context.choices) {
      const card = el("article", void 0, "translation-choice");
      card.append(el("h4", choice.translator || choice.translation_id), el("p", [choice.source, choice.reference].filter(Boolean).join(" \xB7 "), "muted"));
      try {
        if (typeof choice.translation_id !== "string" || !/^(dt|ati|aj):.+/.test(choice.translation_id)) throw new Error("This source has no supported exact version identifier. No source was requested.");
        const descriptor = scopeDescriptor(choice, context.uid);
        if (descriptor) {
          card.append(el("p", descriptor.label + " \xB7 not whole-unit coverage", "notice"), button("Review " + descriptor.label.toLowerCase(), () => reviewTranslationScope(choice, descriptor, context, token)));
        } else card.append(button("Read source \xB7 " + [choice.translator, choice.source, choice.reference].filter(Boolean).join(" \xB7 "), () => englishPage({ uid: context.uid, translation: choice.translation_id, limit: 6e3 }, token, context)));
      } catch (error) {
        card.append(el("p", error.message, "notice"));
      }
      target.append(card);
    }
  }
  function reviewTranslationScope(choice, descriptor, context, token) {
    ++studyEpoch;
    const target = studyTarget("Review the source before retrieving it.");
    target.replaceChildren(el("h3", "Review English source scope"));
    target.append(el("p", "P\u0101li selection: " + context.citation), el("p", [choice.translator, choice.source, choice.reference].filter(Boolean).join(" \xB7 ")));
    scopeSummary(descriptor, target);
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
      const data = await tool("get_translation", args);
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
  async function commentary(uid, token, offset = 0) {
    const studyToken = ++studyEpoch;
    const target = $("study");
    target.replaceChildren(el("p", "Opening commentary\u2026"));
    try {
      const data = await tool("get_commentary", { uid, offset, limit: 20, script: $("script").value });
      if (token !== epoch || studyToken !== studyEpoch) return;
      target.replaceChildren(el("h3", "Traditional commentary \xB7 not canonical root text"));
      notes(data, target);
      for (const segment of data.segments || []) target.append(el("p", segment.text, "passage"));
      if (data.next_offset !== null && data.next_offset !== void 0) target.append(button("Next commentary page \u2192", () => commentary(uid, token, data.next_offset)));
      if (data.available === false || !data.segments?.length) target.append(el("p", "No verified aligned commentary is available for this selection.", "notice"));
      provenance(data, target);
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"));
    }
  }
  function studyTarget(message) {
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
      const data = await tool("analyse_passage", args);
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
  async function relatedTexts(uid, token, offset = 0) {
    const studyToken = ++studyEpoch, target = studyTarget("Finding recorded related passages\u2026");
    try {
      const data = await tool("get_parallels", { uid, offset, limit: 10 });
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
      if (offset > 0) pagination.append(button("\u2190 Previous related links", () => relatedTexts(uid, token, Math.max(0, offset - 10))));
      if (data.next_offset !== null && data.next_offset !== void 0) pagination.append(button("Next related links \u2192", () => relatedTexts(uid, token, data.next_offset)));
      target.append(pagination);
      if (data.suttacentral_parallels?.url) {
        target.append(el("p", data.suttacentral_parallels.note, "muted"), external("Explore external parallels (link only)", data.suttacentral_parallels.url));
      }
      provenance(data, target);
    } catch (error) {
      if (token === epoch && studyToken === studyEpoch) target.replaceChildren(el("p", error.message, "notice"), button("Retry related-text lookup", () => relatedTexts(uid, token, offset)));
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
    if (typeof data.found !== "number" || !data.sources?.dpd?.attribution || !data.sources?.dpd?.license || !["english_to_pali", "pali_to_english"].some((key) => Array.isArray(data[key]))) throw new Error("The glossary response is incomplete or missing its source terms. This is not a no-match result.");
    notes(data);
    if (data.note) view.append(el("p", data.note, "notice"));
    for (const [key, title] of [["english_to_pali", "English \u2192 P\u0101li"], ["pali_to_english", "P\u0101li \u2192 English"]]) {
      if (!data[key]?.length) continue;
      view.append(el("h3", title));
      const cards = el("div", void 0, "cards");
      for (const entry of data[key]) {
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
  async function plans(args, token) {
    const name = args.get("name");
    if (!name) {
      const catalog = planCatalog(await tool("reading_plan", {}));
      if (token !== epoch) return;
      heading("AT YOUR OWN PACE", "Reading plans");
      view.append(el("p", "Follow the existing sourced reading orders. Day numbers are steps, not deadlines. Marks record your choice only; they do not prove comprehension or completion of every passage.", "notice"));
      const cards = el("div", void 0, "cards");
      for (const plan of catalog) {
        const card = link("", route("plans", { name: plan.name, day: 1 }), "entry");
        card.append(el("strong", plan.title), el("p", plan.description), el("small", plan.days + " days \xB7 " + local.reading_progress.filter((x) => x.name === plan.name).length + " saved day marks"));
        cards.append(card);
      }
      view.append(cards);
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
      status.textContent = saved2 ? undo ? "Day mark removed from this browser." : "Day marked in this browser only." : "Browser storage is unavailable. Export reading progress before closing this tab.";
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
      const file = input.files[0], request = ++generation;
      input.value = "";
      if (!file) return;
      preview.replaceChildren(el("p", "Reading the local export\u2026"));
      try {
        if (file.size > MAX_IMPORT_BYTES) throw Error("This file exceeds 16 MiB. Nothing was imported.");
        const incoming = parseBookmarks(await file.text());
        if (request !== generation || token !== epoch) return;
        const merge = bookmarkMerge(local.saved, incoming), title = el("h3", "Review bookmark import");
        title.tabIndex = -1;
        preview.replaceChildren(title, el("p", file.name), el("p", merge.added.length + " new bookmarks \xB7 " + merge.skipped + " already saved. Existing notes will not be overwritten.", "notice"));
        if (merge.added.length) {
          const list = el("ul");
          for (const item of merge.added.slice(0, 10)) list.append(el("li", item.title + " \xB7 " + item.ref));
          preview.append(list);
          if (merge.added.length > 10) preview.append(el("p", "And " + (merge.added.length - 10) + " more."));
          preview.append(button("Add " + merge.added.length + " new bookmarks", () => {
            if (token !== epoch || request !== generation) return;
            try {
              const current = bookmarkMerge(local.saved, incoming);
              local.saved = current.saved;
              const durable = persist();
              saved();
              status.textContent = durable ? current.added.length + " bookmarks restored in this browser. Existing notes kept." : "Bookmarks restored in this tab only. Storage is unavailable; export them before closing.";
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
        if (request === generation && token === epoch) preview.replaceChildren(el("p", error.message, "notice"));
      }
    });
    return section;
  }
  function saved() {
    view.replaceChildren();
    heading("YOUR PERSONAL READING", "Saved passages");
    view.append(el("p", "Bookmarks and notes stay in this browser only. They are not scripture, synced, or backed up. Export them to keep a copy.", "notice"));
    view.append(button("Export bookmarks and notes", () => {
      exportPersonal({ format: KEY, saved: local.saved }, "pali-library-bookmarks.json");
    }));
    view.append(bookmarkImporter());
    if (!local.saved.length) view.append(el("p", "Save a passage while reading to find it here."));
    for (const item of [...local.saved]) {
      const box = el("article", void 0, "segment");
      const index = Number.isSafeInteger(item.offset) && item.offset >= 0 ? item.offset : Number(item.ref.match(/\/c?(\d+)$/)?.[1] || 1) - 1;
      box.append(link(item.title + " \xB7 " + item.ref, route("read", { ...readingArgs(item.uid), offset: Math.floor(index / 30) * 30, ref: item.ref })));
      const label = el("label", "Your personal note");
      const input = el("textarea");
      input.className = "note-field";
      input.maxLength = 4e3;
      input.value = typeof item.note === "string" ? item.note : "";
      label.append(input);
      box.append(label);
      box.append(button("Save note", () => {
        const original = local.saved.find((x) => x.uid === item.uid && x.ref === item.ref);
        if (original) original.note = input.value;
        if (persist()) status.textContent = "Personal note saved in this browser.";
      }), button("Remove bookmark", () => {
        local.saved = local.saved.filter((x) => !(x.uid === item.uid && x.ref === item.ref));
        persist();
        render();
      }));
      if (item.source_commit) box.append(el("small", "Saved source revision: " + item.source_commit, "muted"));
      view.append(box);
    }
  }
  function about() {
    heading("A LIBRARY, NOT A TEACHER", "Read with the source in view.");
    for (const text3 of ["The bundled P\u0101li is retrieved from the VRI Cha\u1E6D\u1E6Dha Sa\u1E45g\u0101yana edition. Scripture is never generated or reconstructed. Abbreviations and uncertain alignments stay labelled.", "English translations are available for a subset of texts and fetched only after you choose them. Translators\u2019 wording is not silently exchanged. Commentary is labelled separately from canonical text.", "VRI and several translation/dictionary sources carry non-commercial terms. This reading interface adds no permission to redistribute, translate or commercialize their work.", "Your saved passages, notes, manual reading-plan marks and preferences are stored in this browser. The app has no accounts, advertising, analytics, cloud sync or offline web download. The server may hold your IP temporarily for rate limiting; deployment providers may keep separate infrastructure logs."]) view.append(el("p", text3));
    const links = el("div", void 0, "toolbar");
    links.append(external("Source and licence register", "https://github.com/DaniilKi/pali-canon-claude/blob/dev/pali-reliability/THIRD_PARTY.md"), external("Project and complete MCP toolset", "https://github.com/DaniilKi/pali-canon-claude"));
    view.append(links);
  }
  async function render() {
    if (location.hash === "#content" && view.childElementCount) {
      $("content").focus();
      return;
    }
    const token = ++epoch;
    ++studyEpoch;
    view.replaceChildren();
    status.textContent = "Opening the library\u2026";
    const [page, query = ""] = location.hash.slice(1).split("?"), args = new URLSearchParams(query);
    try {
      if (page === "read") await read(args, token);
      else if (page === "search") await search(args, token);
      else if (page === "glossary") await dictionary(args, token);
      else if (page === "daily") await daily(args, token);
      else if (page === "plans") await plans(args, token);
      else if (page === "saved") saved();
      else if (page === "about") about();
      else await browse(args, token);
      if (token !== epoch) return;
      status.textContent = storageOK ? "" : "Browser storage is unavailable; export your personal data before closing this tab.";
      focusHeading();
    } catch (error) {
      if (token !== epoch) return;
      view.replaceChildren();
      heading("UNABLE TO OPEN", "No passage was substituted.");
      view.append(el("p", error.message, "notice"), button("Try again", render), link("Browse the library", route("browse", { node: "canon" }), "button"));
      status.textContent = "The request failed.";
    }
  }
  window.addEventListener("hashchange", render);
  render();
})();
