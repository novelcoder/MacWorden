"use client";

import { useState, type FormEvent } from "react";

const SUBSCRIBE_URL = "https://6a0d050f0009f1272cb1.sfo.appwrite.run/";

export default function NewsletterForm({ buttonLabel = "Send It" }: { buttonLabel?: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [invalid, setInvalid] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
    const val = input.value.trim();

    if (!val || !val.includes("@")) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setStatus("submitting");

    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (!res.ok) throw new Error("subscription failed");
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="signup-success on" id="nl-success">
        <strong>You&apos;re in.</strong>
        Check your inbox &mdash; your free copy of <em>When Justice Calls</em> is on its way.
        You&apos;ll also receive Mac Worden book news and release alerts.
      </div>
    );
  }

  return (
    <div>
      <form className="signup-form" id="nl-form" onSubmit={handleSubmit}>
        <input
          type="email"
          id="nl-email"
          name="email"
          placeholder="Your email address"
          aria-label="Your email address"
          autoComplete="email"
          required
          disabled={status === "submitting"}
          style={invalid ? { borderColor: "#8B2418" } : undefined}
        />
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Joining..." : buttonLabel}
        </button>
      </form>
      {status === "error" && (
        <p className="signup-error" role="alert">
          We couldn&apos;t add you just now. Please try again.
        </p>
      )}
    </div>
  );
}
