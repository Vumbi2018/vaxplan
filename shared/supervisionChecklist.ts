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
  { value: "rating", label: "Rating (1–5)", description: "A 1 to 5 score" },
  { value: "date", label: "Date", description: "Pick a date" },
  { value: "gps", label: "GPS location", description: "Capture the device's current GPS coordinates" },
  { value: "image", label: "Photo / image", description: "Attach a photo taken on the device" },
];

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
  key: string; // == ChecklistTemplateItem.id
  label: string;
  type?: ChecklistQuestionType;
  response?: "yes" | "no" | "na" | ""; // yes_no / true_false (true->yes, false->no)
  value?: unknown; // text | number | select | multi-select | rating | date | gps {lat,lng,accuracy} | image (data URL)
  note?: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
}

// Turn an authored template into a blank set of answers for a new visit.
export function templateToAnswers(items: ChecklistTemplateItem[]): ChecklistAnswer[] {
  return (items || []).map((it) => ({
    key: it.id,
    label: it.label,
    type: it.type,
    response: it.type === "yes_no" || it.type === "true_false" ? "" : undefined,
    value: it.type === "multi_select" ? [] : undefined,
    note: "",
    helpText: it.helpText,
    required: it.required,
    options: it.options,
  }));
}

// Score = % of "yes"/"true" responses among the yes_no + true_false items that
// were answered yes or no (N/A and non-scorable question types are ignored).
export function computeChecklistScore(answers: ChecklistAnswer[]): number {
  const scorable = (answers || []).filter((a) => {
    const isScorableType = !a.type || a.type === "yes_no" || a.type === "true_false";
    return isScorableType && (a.response === "yes" || a.response === "no");
  });
  if (!scorable.length) return 0;
  const yes = scorable.filter((a) => a.response === "yes").length;
  return Math.round((yes / scorable.length) * 100);
}
