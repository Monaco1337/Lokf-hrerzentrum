/**
 * Lead import parser — reads .xlsx / .csv buffers into normalized row objects.
 *
 * SheetJS (xlsx) parses both formats. We read every sheet cell as a string,
 * auto-detect the standard columns (Vorname/Nachname/E-Mail/Telefon/Ort) and
 * expose the detected header mapping so the UI can present/override it.
 */
import * as XLSX from "xlsx";

export type ImportColumnKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "city";

export interface ParsedImportRow {
  /** 1-based row index within the sheet (excluding the header row). */
  rowIndex: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  /** The original row keyed by the source header, for auditing. */
  raw: Record<string, string>;
}

export interface ParsedImportFile {
  headers: string[];
  mapping: Partial<Record<ImportColumnKey, string>>;
  rows: ParsedImportRow[];
}

const HEADER_ALIASES: Record<ImportColumnKey, string[]> = {
  firstName: ["vorname", "firstname", "first name", "first_name", "given name"],
  lastName: [
    "nachname",
    "lastname",
    "last name",
    "last_name",
    "surname",
    "name",
    "familienname",
  ],
  email: ["email", "e-mail", "e mail", "mail", "emailadresse", "e-mail-adresse"],
  phone: [
    "telefon",
    "phone",
    "handy",
    "mobil",
    "mobile",
    "telefonnummer",
    "rufnummer",
    "tel",
    "nummer",
  ],
  city: ["stadt", "ort", "city", "wohnort", "standort"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectMapping(
  headers: string[],
): Partial<Record<ImportColumnKey, string>> {
  const mapping: Partial<Record<ImportColumnKey, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  (Object.keys(HEADER_ALIASES) as ImportColumnKey[]).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    const hit = normalized.find((h) => aliases.includes(h.norm));
    if (hit) mapping[key] = hit.raw;
  });
  return mapping;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

/**
 * Parse an uploaded workbook buffer. `overrideMapping` lets the UI pin columns
 * explicitly; otherwise the mapping is auto-detected from the header row.
 */
export function parseLeadImport(
  buffer: Buffer,
  overrideMapping?: Partial<Record<ImportColumnKey, string>>,
): ParsedImportFile {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], mapping: {}, rows: [] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { headers: [], mapping: {}, rows: [] };
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (matrix.length === 0) {
    return { headers: [], mapping: {}, rows: [] };
  }

  const headers = (matrix[0] as unknown[]).map(cellToString);
  const mapping = { ...detectMapping(headers), ...(overrideMapping ?? {}) };

  const colIndex = (key: ImportColumnKey): number => {
    const header = mapping[key];
    if (!header) return -1;
    return headers.findIndex((h) => h === header);
  };
  const idx = {
    firstName: colIndex("firstName"),
    lastName: colIndex("lastName"),
    email: colIndex("email"),
    phone: colIndex("phone"),
    city: colIndex("city"),
  };

  const rows: ParsedImportRow[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const cells = (matrix[r] as unknown[]) ?? [];
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      raw[h || `col_${i}`] = cellToString(cells[i]);
    });
    const get = (i: number): string => (i >= 0 ? cellToString(cells[i]) : "");
    rows.push({
      rowIndex: r,
      firstName: get(idx.firstName),
      lastName: get(idx.lastName),
      email: get(idx.email),
      phone: get(idx.phone),
      city: get(idx.city),
      raw,
    });
  }

  return { headers, mapping, rows };
}
