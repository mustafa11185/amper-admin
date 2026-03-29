export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: "#060D1A",
        backgroundImage:
          "linear-gradient(rgba(45,140,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(45,140,255,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className="flex flex-col items-center gap-8 px-6">
        {/* Amper Hexagon Logo */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M48 4L88 26V70L48 92L8 70V26L48 4Z"
            stroke="#2D8CFF"
            strokeWidth="2"
            fill="rgba(45,140,255,0.08)"
          />
          <text
            x="48"
            y="56"
            textAnchor="middle"
            fill="#2D8CFF"
            fontSize="28"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            A
          </text>
        </svg>

        {/* Title */}
        <h1
          className="text-4xl font-bold text-white text-center"
          dir="rtl"
        >
          ✅ قاعدة البيانات جاهزة
        </h1>

        {/* Subtitle */}
        <p
          className="text-xl text-center"
          style={{ color: "#2D8CFF" }}
          dir="rtl"
        >
          تم إنشاء 55 جدول بنجاح
        </p>

        {/* Credentials Box */}
        <div
          className="rounded-xl px-8 py-5 text-center"
          style={{
            backgroundColor: "rgba(45,140,255,0.08)",
            border: "1px solid rgba(45,140,255,0.2)",
          }}
        >
          <p className="text-sm text-gray-400 mb-2">بيانات الدخول</p>
          <p
            className="text-lg text-white tracking-wide"
            style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          >
            admin@amper.iq / Admin@123
          </p>
        </div>

        {/* Button */}
        <button
          className="mt-4 px-8 py-3 rounded-xl text-white font-semibold text-lg transition-opacity hover:opacity-90 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #2D8CFF, #7C3AED)",
          }}
        >
          المتابعة إلى Amper Admin
        </button>
      </div>
    </div>
  );
}
