"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Field, FormError, SubmitButton, fieldStyle } from "./form";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/**
 * Field limits mirror `backend/src/schemas/contact.ts` exactly. The server
 * is the authority — these `maxLength` attributes are a courtesy to the
 * person typing, not a validation layer, per docs/08_Security_Standards.md.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const sending = status.kind === "sending";
  const incomplete = !name || !email || !subject || !message;

  async function handleSubmit() {
    setStatus({ kind: "sending" });

    try {
      await apiFetch<{ data: { id: string } }>("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, subject, message }),
      });
      setStatus({ kind: "sent" });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      // The API returns 429 with a RATE_LIMITED code when someone has sent
      // several messages within an hour. `apiFetch` collapses every non-2xx
      // into one Error carrying the status, so this distinguishes on that
      // rather than telling a rate-limited person to "try again" — which
      // would just get them rate-limited again.
      const rateLimited = err instanceof Error && err.message.includes("429");
      setStatus({
        kind: "error",
        message: rateLimited
          ? "You've sent several messages recently. Please wait a while before sending another."
          : "Couldn't send your message. Please try again in a moment.",
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div
        role="status"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
        }}
      >
        <h3 style={{ fontSize: 18 }}>Message sent</h3>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
          Thanks — someone from the committee will get back to you.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          style={{
            marginTop: "var(--space-4)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            padding: "8px 16px",
            cursor: "pointer",
            background: "transparent",
            color: "var(--text-primary)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Field id="contact-name" label="NAME">
        <input
          id="contact-name"
          value={name}
          maxLength={100}
          disabled={sending}
          onChange={(e) => setName(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field id="contact-email" label="EMAIL">
        <input
          id="contact-email"
          type="email"
          value={email}
          maxLength={255}
          disabled={sending}
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field id="contact-subject" label="SUBJECT">
        <input
          id="contact-subject"
          value={subject}
          maxLength={200}
          disabled={sending}
          onChange={(e) => setSubject(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field id="contact-message" label="MESSAGE" hint={`${message.length} / 5000`}>
        <textarea
          id="contact-message"
          value={message}
          maxLength={5000}
          rows={7}
          disabled={sending}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </Field>

      {status.kind === "error" && <FormError>{status.message}</FormError>}

      <div>
        <SubmitButton onClick={handleSubmit} disabled={sending || incomplete}>
          {sending ? "Sending…" : "Send message"}
        </SubmitButton>
      </div>
    </div>
  );
}
