"use client";
export const dynamic = 'force-dynamic'

import { useActionState, useEffect } from "react";
import { loginAction } from "./actions";
import toast from "react-hot-toast";
import { EndurIcon } from "@/components/EndurLogo";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      return result ?? null;
    },
    null
  );

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error, {
        style: {
          background: "var(--bg-surface)",
          color: "var(--danger)",
          border: "1px solid var(--danger)",
          fontFamily: "var(--font-tajawal)",
        },
      });
    }
  }, [state]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(ellipse 80% 60% at 20% 30%, rgba(27,79,216,0.12), transparent),
          radial-gradient(ellipse 60% 50% at 80% 70%, rgba(124,58,237,0.10), transparent),
          var(--bg-base)
        `,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 20,
          backgroundColor: "var(--bg-surface)",
          boxShadow: "var(--shadow-lg)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* ENDURTECH mark + wordmark */}
        <EndurIcon size={56} variant="light" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-outfit), 'Inter', sans-serif",
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "var(--text-primary)" }}>ENDUR</span>
            <span style={{ color: "var(--brand-teal)" }}>TECH</span>
          </span>
          <span
            style={{
              fontFamily: "var(--font-outfit), 'Inter', sans-serif",
              color: "var(--brand-teal)",
              fontSize: 10,
              letterSpacing: "0.25em",
              fontWeight: 500,
            }}
          >
            SOLUTIONS · IRAQ · EST. 2025
          </span>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-secondary)",
              margin: 0,
              marginTop: 8,
              fontFamily: "var(--font-cairo), var(--font-tajawal), sans-serif",
            }}
          >
            تسجيل الدخول · لوحة الشركة
          </h1>
        </div>

        {/* Form */}
        <form
          action={formAction}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Email Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="email"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-tajawal)",
              }}
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="admin@amper.iq"
              dir="ltr"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 15,
                fontFamily: "var(--font-tajawal)",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-hover)")
              }
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Password Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="password"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-tajawal)",
              }}
            >
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="********"
              dir="ltr"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: 15,
                fontFamily: "var(--font-tajawal)",
                outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--border-hover)")
              }
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Error Message */}
          {state?.error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 14,
                margin: 0,
                fontFamily: "var(--font-tajawal)",
                textAlign: "center",
              }}
            >
              {state.error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #1B4FD8, #7C3AED)",
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-tajawal)",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
              transition: "opacity 0.2s",
              boxShadow: "0 4px 16px rgba(27,79,216,0.3)",
              marginTop: 8,
            }}
          >
            {isPending ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
