/* Browser-only fictional desk. No network calls. State stays in localStorage. */
(function () {
  var KEY = "concierge-pilot-fictional-v1";
  var EXTERNAL_BRIEF = "https://bamedia.agency/bads/";
  var TIMEZONE = "America/Los_Angeles";
  var REVIEW_RESULT = "Reviewed locally — not sent. No message was delivered. No booking was confirmed. No emergency services were contacted by this demo.";
  var SCHEDULE_STATUS = "requested_not_booked";
  var SCHEDULE_NOTE = "Scheduling request recorded. No availability was checked. No calendar is connected. This is not a confirmed booking.";
  var EMERGENCY_NOTICE = "If anyone is in danger, contact appropriate emergency services. This demo does not dispatch help or monitor emergencies.";
  var LEGAL_NOTICE = "This pilot does not provide legal advice. Operational administrative support only — not licensed property management.";
  var TENANCY_NOTICE = "This pilot does not advise on tenancy, notices, deposits, or habitability. Operational administrative support only — not licensed property management or legal advice.";
  var FINANCIAL_NOTICE = "This pilot does not collect payments, quote prices, issue refunds, or give financial advice. Price: (blank)";
  var PURCHASE_NOTICE = "This pilot does not make purchases or place orders.";
  var UNSUPPORTED_NOTICE = "No approved demo FAQ entry matched this request. No answer was drafted from outside the FAQ.";
  var MAX_INTAKE = 2000;
  var MAX_DRAFT = 4000;
  var MAX_NOTE = 1000;
  var MAX_TASKS = 200;

  var PROPERTIES = [
    { id: "harborlight", name: "Harborlight Cottage (fictional)", fictional_address: "Demo Lot H-1, Fictional Bay District, Fictovia 00000", blurb: "Fictional cottage used only in this pilot. Not a real property." },
    { id: "cedar-annex", name: "Cedar Annex Studio (fictional)", fictional_address: "Demo Lot C-2, Sample Orchard District, Fictovia 00000", blurb: "Fictional studio used only in this pilot. Not a real property." },
    { id: "northwind", name: "Northwind Loft (fictional)", fictional_address: "Demo Lot N-3, Fictional Ridge District, Fictovia 00000", blurb: "Fictional loft used only in this pilot. Not a real property." }
  ];
  var OWNERS = [
    { id: "rowan-ellis", property_id: "harborlight", display_name: "Rowan Ellis (fictional demo owner)" },
    { id: "quinn-harper", property_id: "cedar-annex", display_name: "Quinn Harper (fictional demo owner)" },
    { id: "marlow-bennett", property_id: "northwind", display_name: "Marlow Bennett (fictional demo owner)" }
  ];
  var PICKUP_DAY = { harborlight: "Tuesday", "cedar-annex": "Wednesday", northwind: "Friday" };
  var STALL = { harborlight: "H-G1", "cedar-annex": "C-G2", northwind: "N-G3" };

  var RULES = [
    { id: "emergency", label: "Emergency — human review", terms: ["gas leak", "smell of gas", "carbon monoxide", "co alarm", "fire", "smoke", "flames", "medical emergency", "chest pain", "unconscious", "not breathing", "ambulance", "break-in", "burglar", "intruder", "flood", "flooding", "burst pipe", "emergency"], summary: "Any emergency term stops classification. The task is flagged for human review and keeps the emergency notice. This demo does not dispatch help or monitor emergencies." },
    { id: "legal", label: "Legal — human review", terms: ["lawsuit", "attorney", "lawyer", "subpoena", "litigation", "sue", "court", "legal advice", "legal notice"], summary: "Legal terms are flagged for human review. The pilot does not provide legal advice or draft legal notices." },
    { id: "tenancy", label: "Tenancy — human review", terms: ["eviction", "habitability", "tenancy", "notice to vacate", "tenant rights", "lease violation", "security deposit", "rent control", "landlord-tenant"], summary: "Tenancy terms are flagged for human review. The pilot is not licensed property management and does not advise on tenancy." },
    { id: "financial", label: "Financial — human review", terms: ["refund", "invoice", "payment", "billing", "chargeback", "price", "fee", "late fee", "wire transfer", "bank account", "investment", "how much"], summary: "Financial terms are flagged for human review. No price is quoted. Price stays blank. No payment is collected." },
    { id: "purchase", label: "Out of scope — human review", terms: ["buy", "purchase", "shopping", "place an order"], summary: "Purchase language is out of scope. Nothing is ordered or bought." },
    { id: "scheduling", label: "Scheduling request — not a confirmed booking", terms: ["schedule", "reschedule", "appointment", "preferred time", "visit window", "book a"], summary: "Scheduling language records a preferred window labeled America/Los_Angeles. Availability is not checked. No calendar is connected. Nothing is booked." },
    { id: "owner_update", label: "Owner-update draft", terms: ["owner update", "status update", "draft an update", "draft update", "notify the owner", "update the owner"], summary: "Owner-update language builds a local draft from the intake and the fictional property record only. The draft is not sent." },
    { id: "faq", label: "FAQ draft from approved demo text", terms: [], summary: "If no earlier rule matches, the draft is the stored approved FAQ answer for the selected fictional property. The highest keyword count wins. A tie uses the lowest FAQ id. No wording is added." },
    { id: "unsupported", label: "Unsupported — escalated for human review", terms: [], summary: "If nothing matches, the request is escalated. No answer is invented." }
  ];

  var STATUS_LABELS = {
    pending_review: "Pending human review",
    revised: "Revised — still not sent",
    rejected: "Rejected — not sent",
    reviewed_local: "Reviewed locally — not sent"
  };

  var EMERGENCY_DRAFT = "EMERGENCY FLAG — human review required.\n\n" + EMERGENCY_NOTICE + "\n\nNo response was drafted from the approved demo FAQ. The intake was recorded only as a local fictional demo task.";
  var LEGAL_DRAFT = "LEGAL FLAG — human review required.\n\n" + LEGAL_NOTICE + "\n\nNo response was drafted from the approved demo FAQ.";
  var TENANCY_DRAFT = "TENANCY FLAG — human review required.\n\n" + TENANCY_NOTICE + "\n\nNo response was drafted from the approved demo FAQ.";
  var FINANCIAL_DRAFT = "FINANCIAL FLAG — human review required.\n\n" + FINANCIAL_NOTICE + "\n\nNo response was drafted from the approved demo FAQ.";
  var PURCHASE_DRAFT = "OUT OF SCOPE — human review required.\n\n" + PURCHASE_NOTICE + "\n\nNo response was drafted from the approved demo FAQ.";
  var UNSUPPORTED_DRAFT = "UNSUPPORTED — escalated for human review.\n\n" + UNSUPPORTED_NOTICE + "\nPrice: (blank)";

  var storageNote = "";
  var state = emptyState();

  function emptyState() {
    return { nextId: 1, tasks: [] };
  }

  function utcNow() {
    return new Date().toISOString().slice(0, 19) + "Z";
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks) || typeof parsed.nextId !== "number") return emptyState();
      return parsed;
    } catch (err) {
      storageNote = "This browser did not return saved demo tasks. Nothing was sent.";
      return emptyState();
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageNote = "";
    } catch (err) {
      storageNote = "This browser blocked localStorage. The current view is not saved. Nothing was sent.";
    }
  }

  function findProperty(id) {
    return PROPERTIES.filter(function (item) { return item.id === id; })[0] || null;
  }

  function findOwner(id) {
    return OWNERS.filter(function (item) { return item.id === id; })[0] || null;
  }

  function findTask(id) {
    return state.tasks.filter(function (item) { return item.id === id; })[0] || null;
  }

  function buildFaq() {
    var entries = [];
    PROPERTIES.forEach(function (prop) {
      var name = prop.name;
      var address = prop.fictional_address;
      var day = PICKUP_DAY[prop.id];
      var stall = STALL[prop.id];
      entries.push({ id: prop.id + "-trash", property_id: prop.id, title: "Trash and recycling pickup day", keywords: ["trash", "garbage", "recycling", "rubbish", "recycle"], body: "Approved demo FAQ for " + name + ": the fictional trash and recycling pickup day is " + day + ". Place the demo containers at the fictional curb marker before 07:00 America/Los_Angeles. This is a fictional schedule for the pilot and is not an instruction from a live hauler." });
      entries.push({ id: prop.id + "-maintenance", property_id: prop.id, title: "Non-emergency maintenance recording", keywords: ["maintenance", "repair", "repairs", "faucet"], body: "Approved demo FAQ for " + name + ": non-emergency maintenance is recorded as a local concierge task. Name the item and the room. A vendor is not dispatched from this pilot, and a visit is not booked. If a preferred window is required, submit a scheduling request in America/Los_Angeles." });
      entries.push({ id: prop.id + "-parking", property_id: prop.id, title: "Guest parking marker", keywords: ["parking", "stall"], body: "Approved demo FAQ for " + name + ": guest parking in this pilot is fictional stall " + stall + ". The desk can record the request locally. No live garage is contacted and no vehicle is registered." });
      entries.push({ id: prop.id + "-packages", property_id: prop.id, title: "Package holding cabinet", keywords: ["package", "packages", "parcel", "parcels", "delivery"], body: "Approved demo FAQ for " + name + ": fictional package holding is cabinet DEMO-PKG in the fictional office nook at " + address + ". This pilot does not contact carriers." });
      entries.push({ id: prop.id + "-hours", property_id: prop.id, title: "Fictional concierge desk hours", keywords: ["office hours", "concierge desk"], body: "Approved demo FAQ for " + name + ": the fictional concierge desk lists hours of 09:00 to 16:00 America/Los_Angeles, Monday through Friday. This is a demo listing. It is not a live staffed desk and it does not monitor emergencies." });
    });
    return entries;
  }

  var FAQ = buildFaq();

  function termIn(text, term) {
    var lowered = String(text).toLowerCase();
    var needle = String(term).toLowerCase();
    if (/\s/.test(needle) || needle.indexOf("-") !== -1) return lowered.indexOf(needle) !== -1;
    return new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(lowered);
  }

  function orderSentence() {
    return "Rule order: " + RULES.map(function (rule, index) { return (index + 1) + ". " + rule.id; }).join(", ") + ". The first match wins and later rules are not applied.";
  }

  function baseExplanation(rule, hits) {
    return "Matched rule: " + rule.id + ". Matched terms: " + (hits.length ? hits.join(", ") : "(none)") + ". " + rule.summary + " " + orderSentence();
  }

  function schedulingDraft(start, end) {
    return "SCHEDULING REQUEST — not a confirmed booking.\n\nPreferred window, recorded as entered and labeled " + TIMEZONE + ": " + start + " to " + end + ".\n" + SCHEDULE_NOTE + "\nNo response was drafted from the approved demo FAQ.";
  }

  function ownerUpdateDraft(prop, owner, intake) {
    return "DRAFT owner update — not sent.\n\nProperty: " + prop.name + "\nFictional address: " + prop.fictional_address + "\nFictional owner: " + owner.display_name + "\nRecorded intake: " + intake + "\n\nThis draft uses only the intake and the fictional property record shown on the task. It has not been sent. Price: (blank)";
  }

  function classify(intake, propertyId, prop, owner) {
    var rule;
    var hits;
    var i;
    for (i = 0; i < RULES.length; i += 1) {
      rule = RULES[i];
      if (rule.id === "faq") {
        var best = null;
        var bestHits = [];
        var bestKey = null;
        FAQ.forEach(function (entry) {
          if (entry.property_id !== propertyId) return;
          var matched = entry.keywords.filter(function (keyword) { return termIn(intake, keyword); });
          if (!matched.length) return;
          var key = [-matched.length, entry.id];
          if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
            best = entry;
            bestHits = matched;
            bestKey = key;
          }
        });
        if (!best) continue;
        return result("faq", bestHits, best.body, best.id, "Matched rule: faq. FAQ entry " + best.id + " (" + best.title + "). Matched keywords: " + bestHits.join(", ") + ". " + rule.summary + " " + orderSentence(), false);
      }
      if (rule.id === "unsupported") return result("unsupported", [], UNSUPPORTED_DRAFT, null, null, false);
      hits = rule.terms.filter(function (term) { return termIn(intake, term); });
      if (!hits.length) continue;
      if (rule.id === "emergency") return result("emergency", hits, EMERGENCY_DRAFT, null, null, false);
      if (rule.id === "legal") return result("legal", hits, LEGAL_DRAFT, null, null, false);
      if (rule.id === "tenancy") return result("tenancy", hits, TENANCY_DRAFT, null, null, false);
      if (rule.id === "financial") return result("financial", hits, FINANCIAL_DRAFT, null, null, false);
      if (rule.id === "purchase") return result("purchase", hits, PURCHASE_DRAFT, null, null, false);
      if (rule.id === "scheduling") return result("scheduling", hits, "", null, null, true);
      if (rule.id === "owner_update") return result("owner_update", hits, ownerUpdateDraft(prop, owner, intake), null, null, false);
    }
    throw new Error("classification fell through");
  }

  function result(id, hits, draft, faqId, explanation, needsTimes) {
    var rule = RULES.filter(function (item) { return item.id === id; })[0];
    return {
      category: id,
      label: rule.label,
      explanation: explanation || baseExplanation(rule, hits),
      matchedTerms: hits.slice(),
      faqId: faqId,
      draftBody: draft,
      flagEmergency: id === "emergency",
      flagLegal: id === "legal",
      flagTenancy: id === "tenancy",
      flagFinancial: id === "financial",
      flagOutOfScope: id === "purchase" || id === "unsupported",
      needsTimes: needsTimes
    };
  }

  function cleanText(value, maxLen, field, required) {
    var text = value == null ? "" : String(value);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return { error: field + " contains characters that are not allowed." };
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (required !== false && !text) return { error: field + " is required." };
    if (text.length > maxLen) return { error: field + " must be " + maxLen + " characters or fewer." };
    return { value: text };
  }

  function parseLabeled(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value || "");
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var hour = Number(match[4]);
    var minute = Number(match[5]);
    var second = Number(match[6] || 0);
    if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;
    var dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > dim) return null;
    if (year < 2020 || year > 2038) return null;
    return Date.UTC(year, month - 1, day, hour, minute);
  }

  function normalizeTime(value) {
    return value.slice(0, 16);
  }

  function submitIntake(fields) {
    var propertyId = fields.propertyId || "";
    var ownerId = fields.ownerId || "";
    if (!/^[a-z0-9-]{1,40}$/.test(propertyId) || !findProperty(propertyId)) {
      return { ok: false, error: "Choose a fictional property from the demo list." };
    }
    var prop = findProperty(propertyId);
    var owner = findOwner(ownerId);
    if (!/^[a-z0-9-]{1,40}$/.test(ownerId) || !owner || owner.property_id !== propertyId) {
      return { ok: false, error: "Choose a fictional owner that belongs to the selected fictional property." };
    }
    var intake = cleanText(fields.intakeText, MAX_INTAKE, "Request", true);
    if (intake.error) return { ok: false, error: intake.error };
    var classified = classify(intake.value, propertyId, prop, owner);
    var startRaw = (fields.preferredStart || "").trim();
    var endRaw = (fields.preferredEnd || "").trim();
    var draft = classified.draftBody;
    var schedule = null;
    if (classified.needsTimes) {
      if (!startRaw || !endRaw) return { ok: false, error: "Scheduling requests need a preferred start and end. Nothing was saved. No booking was created." };
      var start = parseLabeled(startRaw);
      var end = parseLabeled(endRaw);
      if (start == null) return { ok: false, error: "Preferred start must look like YYYY-MM-DDTHH:MM. Nothing was saved." };
      if (end == null) return { ok: false, error: "Preferred end must look like YYYY-MM-DDTHH:MM. Nothing was saved." };
      if (end <= start) return { ok: false, error: "Preferred end must be after the preferred start. Nothing was saved." };
      if (end - start > 7 * 24 * 60 * 60 * 1000) return { ok: false, error: "Preferred window must be 7 days or shorter. Nothing was saved." };
      var startText = normalizeTime(startRaw);
      var endText = normalizeTime(endRaw);
      draft = schedulingDraft(startText, endText);
      schedule = { preferredStart: startText, preferredEnd: endText, timezone: TIMEZONE, status: SCHEDULE_STATUS, note: SCHEDULE_NOTE };
    } else if (startRaw || endRaw) {
      return { ok: false, error: "Preferred times are only saved for scheduling requests. Remove the times, or include scheduling words such as schedule, appointment, or preferred time." };
    }
    if (state.tasks.length >= MAX_TASKS) return { ok: false, error: "The demo task list is full. Reset the demo to continue." };
    var now = utcNow();
    var task = {
      id: state.nextId,
      createdAt: now,
      updatedAt: now,
      propertyId: propertyId,
      ownerId: ownerId,
      intakeText: intake.value,
      category: classified.category,
      categoryLabel: classified.label,
      explanation: classified.explanation,
      matchedTerms: classified.matchedTerms,
      faqId: classified.faqId,
      draftBody: draft,
      status: "pending_review",
      decisionNote: "",
      flagEmergency: classified.flagEmergency,
      flagLegal: classified.flagLegal,
      flagTenancy: classified.flagTenancy,
      flagFinancial: classified.flagFinancial,
      flagOutOfScope: classified.flagOutOfScope,
      schedule: schedule,
      events: [
        { createdAt: now, eventType: "created", detail: "Intake recorded for a fictional demo property." },
        { createdAt: now, eventType: "classified", detail: classified.explanation }
      ]
    };
    state.nextId += 1;
    state.tasks.push(task);
    persist();
    return { ok: true, id: task.id };
  }

  function openTask(task) {
    return task && (task.status === "pending_review" || task.status === "revised");
  }

  function reviseTask(id, draftValue, noteValue) {
    var task = findTask(id);
    if (!task) return { ok: false, missing: true };
    if (!openTask(task)) return { ok: false, error: "This task is already closed in the local demo. Nothing was sent, booked, or changed." };
    var draft = cleanText(draftValue, MAX_DRAFT, "Draft text", true);
    if (draft.error) return { ok: false, error: draft.error };
    var note = cleanText(noteValue, MAX_NOTE, "Revision note", false);
    if (note.error) return { ok: false, error: note.error };
    var detail = "Draft revised. Still not sent.";
    if (note.value) detail += " Note: " + note.value;
    task.draftBody = draft.value;
    task.status = "revised";
    task.updatedAt = utcNow();
    task.events.push({ createdAt: task.updatedAt, eventType: "revised", detail: detail });
    persist();
    return { ok: true };
  }

  function rejectTask(id, reasonValue) {
    var task = findTask(id);
    if (!task) return { ok: false, missing: true };
    if (!openTask(task)) return { ok: false, error: "This task is already closed in the local demo. Nothing was sent, booked, or changed." };
    var reason = cleanText(reasonValue, MAX_NOTE, "Rejection reason", true);
    if (reason.error) return { ok: false, error: reason.error };
    task.status = "rejected";
    task.decisionNote = reason.value;
    task.updatedAt = utcNow();
    task.events.push({ createdAt: task.updatedAt, eventType: "rejected", detail: "Rejected — not sent. Reason: " + reason.value });
    persist();
    return { ok: true };
  }

  function approveTask(id) {
    var task = findTask(id);
    if (!task) return { ok: false, missing: true };
    if (!openTask(task)) return { ok: false, error: "This task is already closed in the local demo. Nothing was sent, booked, or changed." };
    task.status = "reviewed_local";
    task.decisionNote = REVIEW_RESULT;
    task.updatedAt = utcNow();
    task.events.push({ createdAt: task.updatedAt, eventType: "approved_local", detail: REVIEW_RESULT });
    persist();
    return { ok: true };
  }

  function resetDemo(phrase) {
    if (phrase !== "RESET DEMO") return { ok: false, error: "Type RESET DEMO exactly. Nothing was deleted." };
    state = emptyState();
    persist();
    return { ok: true };
  }

  function h(tag, props, kids) {
    var node = document.createElement(tag);
    var key;
    props = props || {};
    for (key in props) {
      if (!Object.prototype.hasOwnProperty.call(props, key) || props[key] == null || props[key] === false) continue;
      if (key === "text") node.textContent = String(props[key]);
      else if (key === "className") node.className = props[key];
      else if (key === "value" && "value" in node) node.value = String(props[key]);
      else node.setAttribute(key, props[key] === true ? "" : String(props[key]));
    }
    (kids || []).forEach(function (kid) {
      if (kid == null) return;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function pre(className, text) {
    var node = h("pre", { className: className });
    node.textContent = text;
    return node;
  }

  function errors(message) {
    if (!message) return null;
    return h("div", { className: "errors", role: "alert" }, [h("p", { text: "Nothing was saved." }), h("ul", {}, [h("li", { text: message })])]);
  }

  function urbanPhoto(src, srcset, width, height, alt, caption) {
    return h("figure", { className: "urban-photo" }, [
      h("img", {
        src: src,
        srcset: srcset,
        sizes: "(max-width: 800px) 92vw, 440px",
        width: String(width),
        height: String(height),
        alt: alt,
        decoding: "async"
      }),
      h("figcaption", { text: caption })
    ]);
  }

  function urbanSection() {
    return h("section", { id: "urban", className: "panel urban" }, [
      h("h2", { text: "Urban Concierge – Bay Area" }),
      h("p", { className: "meta", text: "External live brief. This demo does not embed it or refresh its data." }),
      h("p", { text: "The brief covers Bay Area events and dining, with compact weather and travel notes. This page does not copy that page, store it, or request it." }),
      h("p", {}, [h("a", { className: "external-brief", href: EXTERNAL_BRIEF, target: "_blank", rel: "noopener noreferrer", text: "Open the external live brief" })]),
      h("p", { className: "hint", text: "This page does not request that address. The browser opens it only if you choose the link." }),
      h("h3", { text: "Supplied views" }),
      h("p", { className: "meta", text: "Two owner photos. No event or date is attached. Live delivery is not connected." }),
      h("div", { className: "urban-photos" }, [
        urbanPhoto(
          "photos/city-1600.jpg",
          "photos/city-800.jpg 800w, photos/city-1600.jpg 1600w",
          1600,
          1066,
          "Urban architecture view from a planted terrace toward towers and an overpass",
          "Urban architecture"
        ),
        urbanPhoto(
          "photos/marina-1445.jpg",
          "photos/marina-800.jpg 800w, photos/marina-1445.jpg 1445w",
          1445,
          1088,
          "Red lips sculpture beside a marina and docked boats",
          "Marina red lips sculpture"
        )
      ]),
      h("h3", { text: "Planned offerings" }),
      h("p", { className: "meta", text: "Planned list only. Not an active feed. Live delivery is not connected." }),
      h("ul", { className: "plain" }, [
        h("li", { text: "sfmedia.agency is the chosen future name for Custom Concierge. Hosting and review are separate. This demo does not redirect BAMedia." }),
        h("li", { text: "Photo-led industry updates, after approval: real estate; lifestyle and salon trends; injury and DUI law; Innkeeper Weekly; foodie insights." })
      ]),
      h("p", { className: "hint", text: "This list is not advice from this desk, and it is not a connected feed." })
    ]);
  }

  function renderTasks() {
    var queue = state.tasks.filter(function (task) { return task.status === "pending_review" || task.status === "revised"; });
    var cards = PROPERTIES.map(function (prop) {
      var owner = OWNERS.filter(function (item) { return item.property_id === prop.id; })[0];
      return h("article", { className: "property", "data-property-id": prop.id }, [
        h("h3", { text: prop.name }),
        h("p", { text: prop.fictional_address }),
        h("p", { text: prop.blurb }),
        h("p", { text: "Fictional owner: " + (owner ? owner.display_name : "") })
      ]);
    });
    var list;
    if (state.tasks.length) {
      list = h("ul", { className: "task-list" }, state.tasks.slice().reverse().map(function (task) {
        var prop = findProperty(task.propertyId);
        return h("li", {}, [
          h("a", { href: "#task/" + task.id, "data-task-id": String(task.id) }, [
            h("strong", { text: prop ? prop.name : task.propertyId }),
            document.createTextNode(" · " + task.categoryLabel)
          ]),
          h("span", { className: "meta", text: STATUS_LABELS[task.status] + " · " + task.createdAt + " UTC" })
        ]);
      }));
    } else {
      list = h("p", { className: "empty", text: "No demo tasks yet. Use New intake and choose a fictional property and fictional owner." });
    }
    mount([
      urbanSection(),
      h("section", { className: "panel" }, [
        h("p", { className: "task-count", "data-count": String(state.tasks.length), text: "Tasks recorded: " + state.tasks.length }),
        h("p", { className: "queue-count", "data-count": String(queue.length), text: "Waiting for review: " + queue.length }),
        h("p", {}, [h("a", { className: "button", href: "#intake", text: "New intake" })])
      ]),
      h("section", {}, [h("h2", { text: "Fictional properties" }), h("div", { className: "cards" }, cards)]),
      h("section", {}, [h("h2", { text: "Task tracker" }), list]),
      h("section", {}, [
        h("h2", { text: "What this desk will not do" }),
        h("ul", { className: "plain" }, [
          "Fictional property and owner records only. No real addresses, clients, or credentials.",
          "Not licensed property management, and not legal, financial, or tenancy advice.",
          "Does not send messages. Approval means reviewed locally — not sent.",
          "Saved only in this browser. Not shared with other people, browsers, or computers.",
          "Does not check availability, connect a calendar, or confirm a booking.",
          "Does not dispatch or monitor emergencies. In danger, contact appropriate emergency services.",
          "Does not take payment. Price: (blank).",
          "Does not make purchases or call outside services.",
          "sfmedia.agency is a chosen future name only. This page does not host it and does not redirect BAMedia."
        ].map(function (line) { return h("li", { text: line }); }))
      ])
    ]);
  }

  function renderIntake(values, error) {
    values = values || {};
    var propertyOptions = [h("option", { value: "", text: "Select a fictional property" })].concat(PROPERTIES.map(function (prop) {
      var option = h("option", { value: prop.id, text: prop.name });
      if (prop.id === values.propertyId) option.selected = true;
      return option;
    }));
    var ownerOptions = [h("option", { value: "", text: "Select a fictional owner" })].concat(OWNERS.map(function (owner) {
      var option = h("option", { value: owner.id, "data-property": owner.property_id, text: owner.display_name });
      if (owner.id === values.ownerId) option.selected = true;
      return option;
    }));
    var propertySelect = h("select", { id: "property_id", name: "property_id" }, propertyOptions);
    var ownerSelect = h("select", { id: "owner_id", name: "owner_id" }, ownerOptions);
    var intake = h("textarea", { id: "intake_text", name: "intake_text", rows: "6", maxlength: "2000" });
    intake.textContent = values.intakeText || "";
    intake.placeholder = "What day is trash pickup?";
    var start = h("input", { id: "preferred_start", name: "preferred_start", type: "datetime-local", value: values.preferredStart || "" });
    var end = h("input", { id: "preferred_end", name: "preferred_end", type: "datetime-local", value: values.preferredEnd || "" });
    var form = h("form", { id: "intake-form", className: "stack" }, [
      h("label", { for: "property_id", text: "Fictional property" }),
      propertySelect,
      h("label", { for: "owner_id", text: "Fictional owner" }),
      ownerSelect,
      h("label", { for: "intake_text", text: "Request" }),
      intake,
      h("fieldset", {}, [
        h("legend", { text: "Preferred window, only for a scheduling request" }),
        h("p", { className: "hint", text: "Leave these blank unless the request is asking to schedule a time. Times are stored as entered and labeled America/Los_Angeles. Availability is not checked and no booking is confirmed." }),
        h("label", { for: "preferred_start", text: "Preferred start (America/Los_Angeles)" }),
        start,
        h("label", { for: "preferred_end", text: "Preferred end (America/Los_Angeles)" }),
        end
      ]),
      h("button", { type: "submit", text: "Record intake" })
    ]);
    propertySelect.addEventListener("change", function () { syncOwners(propertySelect, ownerSelect); });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var fields = {
        propertyId: propertySelect.value,
        ownerId: ownerSelect.value,
        intakeText: intake.value,
        preferredStart: start.value,
        preferredEnd: end.value
      };
      var outcome = submitIntake(fields);
      if (!outcome.ok) renderIntake(fields, outcome.error);
      else go("#task/" + outcome.id);
    });
    mount([
      h("section", { className: "panel" }, [
        h("h2", { text: "New intake" }),
        h("p", { text: "Choose a fictional property and fictional owner. The page classifies the text with the visible rules, then writes a draft or an escalation. Nothing is sent. Use fictional selections only." }),
        errors(error),
        form
      ])
    ]);
    syncOwners(propertySelect, ownerSelect);
  }

  function syncOwners(propertySelect, ownerSelect) {
    var match = "";
    var currentOk = false;
    Array.prototype.forEach.call(ownerSelect.options, function (option) {
      var propertyId = option.getAttribute("data-property");
      if (!propertyId) return;
      var show = propertyId === propertySelect.value;
      option.hidden = !show;
      if (show && !match) match = option.value;
      if (show && option.value === ownerSelect.value) currentOk = true;
    });
    if (!currentOk) ownerSelect.value = match;
  }

  function flagBoxes(task) {
    var boxes = [];
    if (task.flagEmergency) boxes.push(h("p", { className: "flag flag-emergency", text: EMERGENCY_NOTICE }));
    if (task.flagLegal) boxes.push(h("p", { className: "flag flag-legal", text: LEGAL_NOTICE }));
    if (task.flagTenancy) boxes.push(h("p", { className: "flag flag-tenancy", text: TENANCY_NOTICE }));
    if (task.flagFinancial) boxes.push(h("p", { className: "flag flag-financial", text: FINANCIAL_NOTICE }));
    if (task.flagOutOfScope) boxes.push(h("p", { className: "flag flag-scope", text: task.category === "purchase" ? PURCHASE_NOTICE : UNSUPPORTED_NOTICE }));
    if (!boxes.length) boxes.push(h("p", { className: "quiet", text: "No emergency, legal, tenancy, financial, or out-of-scope flag." }));
    return boxes;
  }

  function renderTask(id, error) {
    var task = findTask(id);
    if (!task) {
      mount([h("section", { className: "panel" }, [h("h2", { text: "Not found" }), h("p", { text: "That task is not in this browser." }), h("p", {}, [h("a", { href: "#tasks", text: "Back to tasks" })])])]);
      return;
    }
    var prop = findProperty(task.propertyId);
    var owner = findOwner(task.ownerId);
    var schedule = task.schedule
      ? h("section", { className: "panel schedule", "data-schedule-status": task.schedule.status, "data-timezone": task.schedule.timezone }, [
        h("h2", { text: "Scheduling request" }),
        h("p", { className: "schedule-status", text: task.schedule.note }),
        h("p", { text: "Preferred start: " + task.schedule.preferredStart + " " + task.schedule.timezone }),
        h("p", { text: "Preferred end: " + task.schedule.preferredEnd + " " + task.schedule.timezone }),
        h("p", { text: "The scheduling status is fixed as a request. Editing the draft cannot turn it into a booking." })
      ])
      : h("p", { className: "quiet", text: "No scheduling request is attached. Nothing was booked." });
    var review;
    if (task.status === "reviewed_local") {
      review = h("section", { className: "panel review-result" }, [
        h("h2", { text: "Human review" }),
        h("p", { className: "review-result-text", text: REVIEW_RESULT }),
        h("p", { text: "There is no send action in this pilot." })
      ]);
    } else if (task.status === "rejected") {
      review = h("section", { className: "panel" }, [
        h("h2", { text: "Human review" }),
        h("p", { className: "status-line", text: "Rejected — not sent." }),
        h("p", { text: "Reason: " + task.decisionNote }),
        h("p", { text: "There is no send action in this pilot." })
      ]);
    } else {
      var draftField = h("textarea", { id: "draft_body", name: "draft_body", rows: "6", maxlength: "4000" });
      draftField.textContent = task.draftBody;
      var noteField = h("input", { id: "revision_note", name: "revision_note", maxlength: "1000" });
      var reasonField = h("input", { id: "reason", name: "reason", maxlength: "1000" });
      var revise = h("form", { id: "revise-form", className: "stack" }, [
        h("label", { for: "draft_body", text: "Draft text" }),
        draftField,
        h("label", { for: "revision_note", text: "Revision note (optional)" }),
        noteField,
        h("button", { type: "submit", text: "Save revision" })
      ]);
      var reject = h("form", { id: "reject-form", className: "stack" }, [
        h("label", { for: "reason", text: "Rejection reason" }),
        reasonField,
        h("button", { type: "submit", className: "danger", text: "Reject" })
      ]);
      var approve = h("form", { id: "approve-form", className: "stack" }, [
        h("button", { type: "submit", text: "Approve for demo" }),
        h("p", { className: "hint", text: "This marks the draft reviewed on this computer. It does not send anything." })
      ]);
      revise.addEventListener("submit", function (event) {
        event.preventDefault();
        var outcome = reviseTask(task.id, draftField.value, noteField.value);
        renderTask(task.id, outcome.ok ? "" : outcome.error);
      });
      reject.addEventListener("submit", function (event) {
        event.preventDefault();
        var outcome = rejectTask(task.id, reasonField.value);
        renderTask(task.id, outcome.ok ? "" : outcome.error);
      });
      approve.addEventListener("submit", function (event) {
        event.preventDefault();
        var outcome = approveTask(task.id);
        renderTask(task.id, outcome.ok ? "" : outcome.error);
      });
      review = h("section", { className: "panel" }, [
        h("h2", { text: "Human review" }),
        h("p", { text: "Revise, reject, or approve for demo. None of these actions send a message, confirm a booking, or contact emergency services. Safety notices stay on the task even if the draft is edited." }),
        approve,
        reject,
        revise
      ]);
    }
    mount([
      h("article", { className: "task", "data-task-id": String(task.id), "data-category": task.category, "data-status": task.status }, [
        h("p", { className: "kicker", text: "Task " + task.id }),
        h("h2", { text: task.categoryLabel }),
        h("p", { className: "status-line", "data-status-label": STATUS_LABELS[task.status], text: STATUS_LABELS[task.status] }),
        errors(error),
        flagBoxes(task),
        h("section", { className: "panel" }, [
          h("h2", { text: "Fictional record" }),
          h("p", { text: "Property: " + (prop ? prop.name : "") }),
          h("p", { text: "Fictional address: " + (prop ? prop.fictional_address : "") }),
          h("p", { text: "Fictional owner: " + (owner ? owner.display_name : "") }),
          h("p", { className: "meta", text: "Recorded " + task.createdAt + " UTC" }),
          h("h3", { text: "Intake" }),
          pre("intake", task.intakeText)
        ]),
        h("section", { className: "panel" }, [
          h("h2", { text: "Classification" }),
          h("p", { className: "explanation", text: task.explanation }),
          h("p", { text: "Matched terms: " + (task.matchedTerms.length ? task.matchedTerms.join(", ") : "(none)") }),
          h("p", { text: "Approved FAQ entry: " + (task.faqId || "none") }),
          h("ul", { className: "rule-order" }, RULES.map(function (rule, index) {
            var mark = rule.id === task.category ? " (matched)" : "";
            return h("li", { className: rule.id === task.category ? "matched" : "", text: (index + 1) + ". " + rule.id + " — " + rule.label + mark });
          }))
        ]),
        h("section", { className: "panel" }, [h("h2", { text: "Response draft" }), pre("draft", task.draftBody)]),
        schedule,
        review,
        h("section", {}, [
          h("h2", { text: "History" }),
          h("ol", { className: "history" }, task.events.map(function (event) {
            return h("li", {}, [h("span", { className: "meta", text: event.createdAt + " UTC · " + event.eventType }), h("p", { text: event.detail })]);
          }))
        ])
      ].reduce(function (all, item) { return all.concat(item); }, []))
    ]);
  }

  function renderReview() {
    var waiting = state.tasks.filter(function (task) { return task.status === "pending_review" || task.status === "revised"; }).slice().reverse();
    var inner = waiting.length
      ? h("ul", { className: "task-list" }, waiting.map(function (task) {
        var prop = findProperty(task.propertyId);
        return h("li", {}, [
          h("a", { href: "#task/" + task.id, text: "Task " + task.id + " · " + (prop ? prop.name : "") + " · " + task.categoryLabel }),
          h("span", { className: "meta", text: STATUS_LABELS[task.status] })
        ]);
      }))
      : h("p", { className: "empty", text: "The review queue is empty." });
    mount([h("section", { className: "panel" }, [
      h("h2", { text: "Human review queue" }),
      h("p", { className: "queue-count", "data-count": String(waiting.length), text: "Waiting for review: " + waiting.length }),
      h("p", { text: "Approval marks a draft reviewed on this computer. It does not send the draft." }),
      inner
    ])]);
  }

  function renderFaq() {
    var groups = PROPERTIES.map(function (prop) {
      return h("section", {}, [h("h2", { text: prop.name })].concat(FAQ.filter(function (entry) {
        return entry.property_id === prop.id;
      }).map(function (entry) {
        return h("article", { className: "faq", id: "faq-" + entry.id }, [
          h("h3", { text: entry.title }),
          h("p", { className: "meta", text: "Keywords: " + entry.keywords.join(", ") }),
          h("p", { className: "faq-body", text: entry.body })
        ]);
      })));
    });
    mount([h("section", { className: "panel" }, [
      h("h2", { text: "Approved demo FAQ" }),
      h("p", { text: "These paragraphs are the only source for an ordinary response draft. If a request does not match one of them, and no earlier safety rule applies, the page escalates it and does not invent an answer." })
    ])].concat(groups));
  }

  function renderRules() {
    mount([h("section", { className: "panel" }, [
      h("h2", { text: "Classification rules" }),
      h("p", { text: "The classifier checks these rules from top to bottom. The first match wins. Later rules are not applied. The same list is used for every intake." }),
      h("p", { text: "Scheduling words such as “schedule” win over the FAQ. Ask a FAQ question without those words if you want the approved paragraph copied into the draft." }),
      h("ul", { className: "rules" }, RULES.map(function (rule, index) {
        return h("li", {}, [
          h("h3", { text: (index + 1) + ". " + rule.id }),
          h("p", { text: rule.label }),
          h("p", { text: rule.summary }),
          h("p", { className: "meta", text: "Terms: " + (rule.terms.length ? rule.terms.join(", ") : "(see the note)") })
        ]);
      }))
    ])]);
  }

  function renderGuide() {
    var steps = [
      "Read the banner. This desk is a fictional demo and is not connected to live services.",
      "Read the storage line. Tasks stay in this browser only. They are not shared and there is no account.",
      "Open Urban Concierge. The live brief is an external link for Bay Area events and dining, with compact weather and travel notes. This page does not embed or refresh it.",
      "Open Approved FAQ. Response drafts for ordinary questions are copied only from those entries.",
      "Open New intake. Choose Harborlight Cottage (fictional) and Rowan Ellis (fictional demo owner). Ask: What day is trash pickup?",
      "On the task, read the matched rule. The response draft should be the approved FAQ paragraph for that property.",
      "Use the human review actions to revise, reject, or approve for demo. Approval reads “Reviewed locally — not sent”. There is no send button.",
      "Submit a question the FAQ does not cover. It is escalated and no answer is invented.",
      "Submit “There is a gas leak”. The task is flagged. Contact appropriate emergency services. This demo does not dispatch help or monitor emergencies.",
      "Submit a scheduling request with a preferred start and end. The window is labeled America/Los_Angeles. The status stays a request, not a confirmed booking.",
      "Reload the page. The task remains in this browser. Another browser will not have it.",
      "Open Reset, type RESET DEMO, and submit. Tasks in this browser are removed. Fictional property choices stay available."
    ];
    mount([
      h("section", { className: "panel" }, [h("h2", { text: "Click-through" }), h("ol", { className: "guide" }, steps.map(function (step) { return h("li", { text: step }); }))]),
      h("section", {}, [h("h2", { text: "Limitations" }), h("ul", { className: "plain" }, [
        "Fictional selections only. Do not type real client, address, or account details.",
        "Per-browser localStorage only. Not a shared database and not a backend.",
        "No login. Not production security.",
        "sfmedia.agency is the chosen future name. This file does not host it and does not redirect BAMedia.",
        "Does not send messages. Approval means reviewed locally — not sent.",
        "Does not book a time or check availability.",
        "Price: (blank)."
      ].map(function (line) { return h("li", { text: line }); }))])
    ]);
  }

  function renderReset(error) {
    var input = h("input", { id: "reset-confirm", name: "confirm", autocomplete: "off", maxlength: "40" });
    var button = h("button", { id: "reset-submit", type: "submit", text: "Reset fictional demo" });
    var form = h("form", { id: "reset-form", className: "stack" }, [
      h("label", { for: "reset-confirm", text: "Type RESET DEMO to confirm" }),
      input,
      button
    ]);
    input.addEventListener("input", function () { button.disabled = input.value !== "RESET DEMO"; });
    button.disabled = true;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var outcome = resetDemo(input.value);
      if (!outcome.ok) renderReset(outcome.error);
      else go("#tasks");
    });
    mount([h("section", { className: "panel" }, [
      h("h2", { text: "Reset demo data" }),
      h("p", { text: "This deletes fictional tasks saved in this browser only, then leaves the built-in property, owner, and FAQ choices in place. It does not contact a live service and does not change another browser." }),
      errors(error),
      form
    ])]);
  }

  function mount(nodes) {
    var main = document.getElementById("main");
    if (!main) return;
    main.replaceChildren.apply(main, nodes);
    if (storageNote) main.insertBefore(h("p", { className: "errors", role: "alert", text: storageNote }), main.firstChild);
  }

  function go(hash) {
    if (location.hash !== hash) location.hash = hash;
    route();
  }

  function route() {
    var hash = location.hash || "#tasks";
    var taskMatch = /^#task\/([1-9][0-9]{0,8})$/.exec(hash);
    if (hash === "#urban") {
      renderTasks();
      var urban = document.getElementById("urban");
      if (urban && urban.scrollIntoView) urban.scrollIntoView();
    } else if (taskMatch) renderTask(Number(taskMatch[1]), "");
    else if (hash === "#intake") renderIntake();
    else if (hash === "#review") renderReview();
    else if (hash === "#faq") renderFaq();
    else if (hash === "#rules") renderRules();
    else if (hash === "#guide") renderGuide();
    else if (hash === "#reset") renderReset("");
    else renderTasks();
    var current = hash;
    if (taskMatch) current = "#tasks";
    Array.prototype.forEach.call(document.querySelectorAll("#nav a"), function (link) {
      if (link.getAttribute("href") === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function reload() {
    state = loadState();
    route();
  }

  state = loadState();
  window.addEventListener("hashchange", route);
  if (document.getElementById("main")) route();

  window.ConciergePilot = {
    KEY: KEY,
    EXTERNAL_BRIEF: EXTERNAL_BRIEF,
    route: route,
    reload: reload,
    classify: classify,
    submitIntake: submitIntake,
    resetDemo: resetDemo,
    loadState: loadState,
    tasks: function () { return state.tasks.slice(); }
  };
})();
