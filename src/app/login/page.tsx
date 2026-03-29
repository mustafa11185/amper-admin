"use client";

import { useActionState, useEffect } from "react";
import { loginAction } from "./actions";
import toast from "react-hot-toast";

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
        {/* Amper Logo */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="hexGradient"
              x1="8"
              y1="4"
              x2="88"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#1B4FD8" />
            </linearGradient>
          </defs>
          <path
            d="M48 4L88 26V70L48 92L8 70V26L48 4Z"
            fill="url(#hexGradient)"
          />
          <text
            x="48"
            y="58"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="32"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            A
          </text>
        </svg>

        {/* Title */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
            fontFamily: "var(--font-tajawal)",
          }}
        >
          تسجيل الدخول
        </h1>

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
