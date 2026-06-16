"use client";
/**
 * "Noch eine Frage?" — public contact form that flows into the CRM
 * (ContactInquiry table, separate from scored Leads).
 *
 * - Server Action: submitContactInquiry (Zod-validated, IP-throttled).
 * - Anti-spam: hidden honeypot field + minimum render time.
 * - DSGVO: explicit privacy acknowledgement, no consent → no submit.
 * - States: idle → loading → success | error, with cleanly mapped UI.
 *
 * Form internals live in ContactForm.tsx (kept under the file size guardrail).
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { submitContactInquiry } from "@/server/actions/submitContactInquiry";

import {
  ContactCard,
  type ContactFormState,
  type ContactStatus,
  SuccessPanel,
} from "./ContactForm";

const INITIAL: ContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  privacyAccepted: false,
  company: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 \-/()]{6,30}$/;

export function ContactSection() {
  const [values, setValues] = useState<ContactFormState>(INITIAL);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactFormState, string>>
  >({});
  const [status, setStatus] = useState<ContactStatus>({ kind: "idle" });
  const mountedAtRef = useRef<number>(0);

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  const isLoading = status.kind === "loading";
  const isSuccess = status.kind === "success";

  const messageRemaining = useMemo(
    () => 2000 - values.message.length,
    [values.message.length],
  );

  const update = <K extends keyof ContactFormState>(
    key: K,
    val: ContactFormState[K],
  ) => {
    setValues((v) => ({ ...v, [key]: val }));
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const validateClient = (): boolean => {
    const next: Partial<Record<keyof ContactFormState, string>> = {};
    if (!values.firstName.trim()) next.firstName = "Vorname fehlt";
    if (!values.lastName.trim()) next.lastName = "Nachname fehlt";
    if (!values.email.trim()) next.email = "E-Mail fehlt";
    else if (!EMAIL_RE.test(values.email.trim()))
      next.email = "E-Mail-Format prüfen";
    if (values.phone.trim() && !PHONE_RE.test(values.phone.trim()))
      next.phone = "Telefonnummer prüfen";
    if (values.message.trim().length < 10)
      next.message = "Mindestens 10 Zeichen.";
    if (!values.privacyAccepted)
      next.privacyAccepted = "Bitte den Datenschutz bestätigen.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateClient()) return;

    setStatus({ kind: "loading" });

    const renderedAt = mountedAtRef.current
      ? Date.now() - mountedAtRef.current
      : undefined;

    const result = await submitContactInquiry({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      message: values.message.trim(),
      privacyAccepted: values.privacyAccepted,
      company: values.company,
      renderedAt,
    });

    if (result.ok) {
      setStatus({ kind: "success", id: result.data.id });
      setValues(INITIAL);
      setErrors({});
    } else {
      const friendly =
        result.code === "RATE_LIMITED"
          ? "Zu viele Anfragen — bitte später noch einmal versuchen."
          : result.code === "VALIDATION_ERROR"
            ? "Bitte die Eingaben prüfen."
            : "Das Senden hat nicht funktioniert. Bitte erneut versuchen.";
      setStatus({ kind: "error", message: friendly });
    }
  };

  return (
    <section
      id="kontakt"
      aria-label="Nachricht schreiben"
      className="relative scroll-mt-24 bg-white"
    >
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-2 md:pb-32 md:pt-4">
        {isSuccess ? (
          <SuccessPanel onReset={() => setStatus({ kind: "idle" })} />
        ) : (
          <ContactCard
            values={values}
            errors={errors}
            isLoading={isLoading}
            status={status}
            onChange={update}
            onSubmit={handleSubmit}
            messageRemaining={messageRemaining}
          />
        )}
      </div>
    </section>
  );
}
