"use client";

import { useState, type FormEvent } from "react";

const SUBSCRIBE_URL = "https://6a0d050f0009f1272cb1.sfo.appwrite.run/";

export default function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);
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

    try {
      const res = await fetch(SUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (!res.ok) throw new Error("subscription failed");
    } catch (err) {
      console.error(err);
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="signup-success on" id="nl-success">
        <strong>You&apos;re in.</strong>
        Check your inbox &mdash; your free copy of <em>When Justice Calls</em> is on its
        way, and you&apos;ll hear from Mac the day <em>Stray Evidence</em> drops.
      </div>
    );
  }

  return (
    <form className="signup-form" id="nl-form" onSubmit={handleSubmit}>
      <input
        type="email"
        id="nl-email"
        name="email"
        placeholder="Your email address"
        autoComplete="email"
        required
        style={invalid ? { borderColor: "#8B2418" } : undefined}
      />
      <button type="submit">Send It</button>
    </form>
  );
}
