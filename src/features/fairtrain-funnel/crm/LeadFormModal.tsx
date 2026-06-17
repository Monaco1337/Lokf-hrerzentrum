"use client";
/**
 * LeadFormModal — create or edit a lead from the CRM (premium light theme).
 *
 * Create mode runs the full creation pipeline via `createCrmLead` (scoring,
 * status history, automation, audit). Edit mode patches core contact fields
 * via `updateLeadCore`. Both persist through server actions — no local state
 * store — and emit ActivityLog entries server-side.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCrmLead, updateLeadCore } from "@/server/actions/leads";
import {
  EmploymentStatus,
  FunnelPath,
  PreferredLocation,
} from "../types";
import {
  EMPLOYMENT_LABEL,
  FUNNEL_LABEL,
  LOCATION_LABEL,
} from "./leadLabels";
import { Modal } from "./ui/Modal";

export interface LeadFormUser {
  id: string;
  name: string;
}

export interface LeadEditValues {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  source: string | null;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  users: ReadonlyArray<LeadFormUser>;
  initial?: LeadEditValues | undefined;
  onClose: () => void;
}

export function LeadFormModal({ open, mode, users, initial, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [funnelPath, setFunnelPath] = useState<FunnelPath>(FunnelPath.UNEMPLOYED);
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    EmploymentStatus.UNEMPLOYED,
  );
  const [preferredLocation, setPreferredLocation] = useState<PreferredLocation>(
    PreferredLocation.UNDECIDED,
  );
  const [acceptsShiftWork, setAcceptsShiftWork] = useState(true);
  const [assignedToId, setAssignedToId] = useState("");

  function validate(): string | null {
    if (!firstName.trim()) return "Vorname ist erforderlich.";
    if (!lastName.trim()) return "Nachname ist erforderlich.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return "Bitte eine gültige E-Mail angeben.";
    if (phone.trim().length < 3) return "Bitte eine Telefonnummer angeben.";
    return null;
  }

  function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createCrmLead({
              firstName,
              lastName,
              email,
              phone,
              city: city.trim() || null,
              funnelPath,
              employmentStatus,
              preferredLocation,
              acceptsShiftWork,
              source: source.trim() || null,
              assignedToId: assignedToId || null,
            })
          : await updateLeadCore({
              leadId: initial!.id,
              firstName,
              lastName,
              email,
              phone,
              city: city.trim() || null,
              source: source.trim() || null,
            });
      if (!res.ok) {
        setError(res.message || "Speichern fehlgeschlagen.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Neuer Lead" : "Lead bearbeiten"}
      description={
        mode === "create"
          ? "Bewerber manuell anlegen — wird wie ein Funnel-Lead bewertet und protokolliert."
          : "Stammdaten dieses Leads aktualisieren."
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
            {pending ? "Speichern…" : mode === "create" ? "Lead anlegen" : "Speichern"}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vorname" value={firstName} onChange={setFirstName} required />
        <Field label="Nachname" value={lastName} onChange={setLastName} required />
        <Field label="E-Mail" type="email" value={email} onChange={setEmail} required />
        <Field label="Telefon" value={phone} onChange={setPhone} required />
        <Field label="Stadt" value={city} onChange={setCity} />
        <Field label="Quelle" value={source} onChange={setSource} placeholder="z. B. Empfehlung" />

        {mode === "create" ? (
          <>
            <SelectField
              label="Funnel"
              value={funnelPath}
              onChange={(v) => setFunnelPath(v as FunnelPath)}
              options={Object.values(FunnelPath).map((v) => ({ value: v, label: FUNNEL_LABEL[v] }))}
            />
            <SelectField
              label="Beschäftigung"
              value={employmentStatus}
              onChange={(v) => setEmploymentStatus(v as EmploymentStatus)}
              options={Object.values(EmploymentStatus).map((v) => ({
                value: v,
                label: EMPLOYMENT_LABEL[v],
              }))}
            />
            <SelectField
              label="Wunschstandort"
              value={preferredLocation}
              onChange={(v) => setPreferredLocation(v as PreferredLocation)}
              options={Object.values(PreferredLocation).map((v) => ({
                value: v,
                label: LOCATION_LABEL[v],
              }))}
            />
            <SelectField
              label="Bearbeiter"
              value={assignedToId}
              onChange={setAssignedToId}
              options={[
                { value: "", label: "Nicht zugewiesen" },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
            <label className="col-span-full flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={acceptsShiftWork}
                onChange={(e) => setAcceptsShiftWork(e.target.checked)}
              />
              Schichtarbeit akzeptiert
            </label>
          </>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
