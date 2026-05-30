// Shared definitions for configurable supervision checklists.
//
// Kept in shared/ so both the React client and the Express server agree on the
// question types, the template item shape, the captured-answer shape, and the
// scoring rule. (Client must never import from server/.)

export type ChecklistQuestionType =
  | "yes_no"
  | "true_false"
  | "text"
  | "number"
  | "single_select"
  | "multi_select"
  | "rating"
  | "date"
  | "gps"
  | "image";

export const CHECKLIST_QUESTION_TYPES: {
  value: ChecklistQuestionType;
  label: string;
  description: string;
}[] = [
  { value: "yes_no", label: "Yes / No", description: "Yes, No, or N/A — counts toward the score" },
  { value: "true_false", label: "True / False", description: "True, False, or N/A — counts toward the score" },
  { value: "text", label: "Short text", description: "Free-text answer" },
  { value: "number", label: "Number", description: "Numeric answer (e.g. a count or temperature)" },
  { value: "single_select", label: "Single choice", description: "Pick one option from a list" },
  { value: "multi_select", label: "Multiple choice", description: "Pick one or more options from a list" },
  { value: "rating", label: "Rating (1–5)", description: "A 1 to 5 score — can be counted toward the score" },
  { value: "date", label: "Date", description: "Pick a date" },
  { value: "gps", label: "GPS location", description: "Capture the device's current GPS coordinates" },
  { value: "image", label: "Photo / image", description: "Attach a photo taken on the device" },
];

// Sentinel meaning "show the follow-up as soon as the parent has any answer".
export const SHOW_WHEN_ANY = "__any__";

// A question as authored in a template.
export interface ChecklistTemplateItem {
  id: string;
  type: ChecklistQuestionType;
  label: string;
  helpText?: string;
  required?: boolean;
  options?: string[]; // for single_select / multi_select
  min?: number; // for number
  max?: number; // for number

  // --- Follow-up (conditional display) ---
  // When parentId is set, this question is only shown while the parent
  // question's answer matches `showWhen`. `showWhen` meaning depends on the
  // parent type: yes_no -> "yes"/"no"/"na", true_false -> "yes"/"no",
  // single/multi-select -> an option string. SHOW_WHEN_ANY shows it once the
  // parent has any answer.
  parentId?: string;
  showWhen?: string;

  // --- Repeat ---
  // A repeatable question can be answered multiple times during a visit (e.g.
  // one entry per vaccinator). Repeated scorable answers aggregate into the
  // overall score automatically.
  repeatable?: boolean;
  repeatLabel?: string; // singular label for each entry, e.g. "Vaccinator"
  maxRepeats?: number; // optional cap on how many entries can be added

  // --- Scoring ---
  // yes_no / true_false count toward the score unless includeInScore === false.
  // rating counts toward the score only when includeInScore === true.
  includeInScore?: boolean;
}

// A template authored by a national admin and used by lower levels.
export interface ChecklistTemplate {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  items: ChecklistTemplateItem[];
  isActive: boolean;
  createdByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// A single captured answer stored on a supervision visit's `checklist` array.
// Backward-compatible with the legacy yes/no/na shape: `key`, `label`, `response`,
// `note` are preserved; `type` and `value` are added for the richer types.
export interface ChecklistAnswer {
  key: string; // unique per answer instance (== item id, or `${id}__r${n}` for repeats)
  baseKey?: string; // the template item id this answer derives from
  repeatIndex?: number; // 0 for the first/only entry, 1+ for added repeat entries
  label: string;
  type?: ChecklistQuestionType;
  response?: "yes" | "no" | "na" | ""; // yes_no / true_false (true->yes, false->no)
  value?: unknown; // text | number | select | multi-select | rating | date | gps {lat,lng,accuracy} | image (data URL)
  note?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];

  // carried template config so the conduct UI is self-contained
  parentId?: string;
  showWhen?: string;
  repeatable?: boolean;
  repeatLabel?: string;
  maxRepeats?: number;
  includeInScore?: boolean;
}

function blankAnswerFor(it: ChecklistTemplateItem, key: string, repeatIndex: number): ChecklistAnswer {
  return {
    key,
    baseKey: it.id,
    repeatIndex,
    label: it.label,
    type: it.type,
    response: it.type === "yes_no" || it.type === "true_false" ? "" : undefined,
    value: it.type === "multi_select" ? [] : undefined,
    note: "",
    helpText: it.helpText,
    required: it.required,
    options: it.options,
    parentId: it.parentId,
    showWhen: it.showWhen,
    repeatable: it.repeatable,
    repeatLabel: it.repeatLabel,
    maxRepeats: it.maxRepeats,
    includeInScore: it.includeInScore,
  };
}

// Turn an authored template into a blank set of answers for a new visit. Each
// item seeds a single (entry-0) answer; repeatable questions get extra entries
// added during the visit.
export function templateToAnswers(items: ChecklistTemplateItem[]): ChecklistAnswer[] {
  return (items || []).map((it) => blankAnswerFor(it, it.id, 0));
}

// Build a fresh, empty repeat entry from an existing answer of the same question.
export function makeRepeatAnswer(base: ChecklistAnswer, repeatIndex: number): ChecklistAnswer {
  const baseKey = base.baseKey || base.key;
  return {
    ...base,
    key: `${baseKey}__r${repeatIndex}`,
    baseKey,
    repeatIndex,
    response: base.type === "yes_no" || base.type === "true_false" ? "" : undefined,
    value: base.type === "multi_select" ? [] : undefined,
    note: "",
  };
}

function answerHasValue(a: ChecklistAnswer): boolean {
  if (a.response !== undefined) {
    if (a.response === "yes" || a.response === "no" || a.response === "na") return true;
  }
  const v = a.value;
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v as object).length > 0;
  return v !== undefined && v !== null && v !== "";
}

function parentMatches(parent: ChecklistAnswer, showWhen: string | undefined): boolean {
  if (!showWhen || showWhen === SHOW_WHEN_ANY) return answerHasValue(parent);
  const t = parent.type || "yes_no";
  if (t === "yes_no" || t === "true_false") return parent.response === showWhen;
  if (t === "single_select") return parent.value === showWhen;
  if (t === "multi_select") return Array.isArray(parent.value) && (parent.value as string[]).includes(showWhen);
  return String(parent.value ?? "") === showWhen;
}

// A follow-up answer is visible only when its parent's answer matches the
// configured trigger AND the parent itself is visible. Visibility therefore
// cascades down a chain of follow-ups: if an ancestor is hidden, every
// descendant is hidden too — even if a descendant still holds a stale value.
// For repeated questions, a follow-up tracks the parent entry that shares its
// repeat index when available. `seen` guards against cyclic parent references.
export function isAnswerVisible(
  answer: ChecklistAnswer,
  all: ChecklistAnswer[],
  seen: Set<string> = new Set(),
): boolean {
  if (!answer.parentId) return true;
  if (seen.has(answer.key)) return true; // cycle guard — treat as visible
  seen.add(answer.key);
  const sameIndex = all.find(
    (a) => (a.baseKey || a.key) === answer.parentId && (a.repeatIndex ?? 0) === (answer.repeatIndex ?? 0),
  );
  const parent = sameIndex || all.find((a) => (a.baseKey || a.key) === answer.parentId);
  if (!parent) return true;
  if (!parentMatches(parent, answer.showWhen)) return false;
  return isAnswerVisible(parent, all, seen);
}

// Contribution of a single answer to the score, as a 0..1 value, or null when
// it is not a scorable/answered question.
function scoreContribution(a: ChecklistAnswer): number | null {
  const t = a.type || "yes_no";
  if (t === "yes_no" || t === "true_false") {
    if (a.includeInScore === false) return null;
    if (a.response === "yes") return 1;
    if (a.response === "no") return 0;
    return null; // na / unanswered
  }
  if (t === "rating") {
    if (a.includeInScore !== true) return null;
    const v = Number(a.value);
    if (Number.isNaN(v) || v < 1 || v > 5) return null;
    return v / 5;
  }
  return null;
}

// Score = average of every visible, scorable answer's contribution, as a
// percentage. Yes/No and True/False count by default; ratings count when the
// author opted them in. Repeated entries each contribute, so they aggregate
// naturally. Hidden follow-ups (condition not met) are ignored.
export function computeChecklistScore(answers: ChecklistAnswer[]): number {
  const all = answers || [];
  let total = 0;
  let count = 0;
  for (const a of all) {
    if (!isAnswerVisible(a, all)) continue;
    const c = scoreContribution(a);
    if (c === null) continue;
    total += c;
    count += 1;
  }
  if (!count) return 0;
  return Math.round((total / count) * 100);
}
