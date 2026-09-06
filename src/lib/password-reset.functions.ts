import { createServerFn } from "@tanstack/react-start";
import { createHash, randomInt, timingSafeEqual } from "crypto";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

async function sendCodeEmail(to: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Email service is not configured");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Bank of Sydney password reset code",
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px">Password reset</h2>
        <p>Use the verification code below to reset your password. It expires in ${CODE_TTL_MINUTES} minutes.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f4f4f5;padding:16px;text-align:center;border-radius:8px">${code}</p>
        <p style="font-size:13px;color:#555">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend send failed", res.status, body);
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.message || parsed?.error || body;
    } catch {}
    throw new Error(`Email send failed (${res.status}): ${detail}`);
  }
}

export const requestPasswordResetCode = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }
    return { email };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up user — but don't reveal whether the email exists (return ok either way).
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) {
      console.error("listUsers failed", listErr);
      throw new Error("Could not process request");
    }
    const exists = list.users.some((u) => (u.email ?? "").toLowerCase() === data.email);

    if (exists) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const code_hash = hashCode(code);
      const expires_at = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

      // Invalidate any prior unused codes for this email.
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("email", data.email)
        .is("consumed_at", null);

      const { error: insErr } = await supabaseAdmin
        .from("password_reset_codes")
        .insert({ email: data.email, code_hash, expires_at });
      if (insErr) {
        console.error("insert reset code failed", insErr);
        throw new Error("Could not process request");
      }

      await sendCodeEmail(data.email, code);
    }

    return { ok: true } as const;
  });

async function findActiveCode(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("password_reset_codes")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not verify code");
  return data;
}

export const verifyPasswordResetCode = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; code: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    const code = String(data?.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Code must be 6 digits");
    if (!email) throw new Error("Email required");
    return { email, code };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = await findActiveCode(data.email);
    if (!row) throw new Error("Invalid or expired code");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("This code has expired. Please request a new one.");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      throw new Error("Too many attempts. Please request a new code.");
    }
    if (!safeEqual(row.code_hash, hashCode(data.code))) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Incorrect code");
    }
    return { ok: true } as const;
  });

export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; code: string; newPassword: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    const code = String(data?.code ?? "").trim();
    const newPassword = String(data?.newPassword ?? "");
    if (!/^\d{6}$/.test(code)) throw new Error("Code must be 6 digits");
    if (!email) throw new Error("Email required");
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
    return { email, code, newPassword };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = await findActiveCode(data.email);
    if (!row) throw new Error("Invalid or expired code");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("This code has expired. Please request a new one.");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);
      throw new Error("Too many attempts. Please request a new code.");
    }
    if (!safeEqual(row.code_hash, hashCode(data.code))) {
      await supabaseAdmin
        .from("password_reset_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Incorrect code");
    }

    // Find user by email
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error("Could not update password");
    const user = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (!user) throw new Error("Account not found");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (updErr) {
      console.error("updateUserById failed", updErr);
      throw new Error("Could not update password");
    }

    await supabaseAdmin
      .from("password_reset_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true } as const;
  });