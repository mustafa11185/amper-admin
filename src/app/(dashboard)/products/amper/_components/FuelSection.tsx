"use client";

/**
 * FuelSection — P-CO-4.2 (2026-05-16).
 *
 * Amper hub section. Fuel consumption + anomaly/theft signal
 * (suspicious = big fuel drop with little runtime, or implausible
 * burn rate). Computed server-side; this just surfaces it.
 */
import { useFieldOps } from "./useFieldOps";
import { FOLoader, FOError, FOKpi, FOCard, FOEmpty, iqd, dt } from "./fieldOpsUi";

export default function FuelSection() {
  const { data, error } = useFieldOps();
  if (error) return <FOError message={error} />;
  if (!data) return <FOLoader />;

  const s = data.fuel.summary;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FOKpi label="نوافذ القياس" value={s.windows} />
        <FOKpi
          label="لترات (إجمالي)"
          value={s.liters}
          tone="var(--blue-primary)"
        />
        <FOKpi label="كلفة الوقود" value={iqd(s.cost)} tone="var(--warning)" />
        <FOKpi
          label="مشبوهة"
          value={s.suspicious}
          tone={s.suspicious > 0 ? "var(--danger)" : "var(--success)"}
        />
      </div>

      <FOCard>
        <p
          className="text-xs font-bold mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          آخر نوافذ الاستهلاك — المشبوه مظلَّل
        </p>
        {data.fuel.list.length === 0 ? (
          <FOEmpty text="لا بيانات استهلاك وقود" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["النافذة", "لترات", "ل/ساعة", "تشغيل (د)", "هبوط %", "كلفة"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "right",
                          padding: "8px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.fuel.list.map((f, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: f.suspicious
                        ? "rgba(220,38,38,0.06)"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      {dt(f.windowEnd)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontFamily: "var(--font-rajdhani)",
                        fontWeight: 700,
                      }}
                    >
                      {f.liters}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: f.suspicious
                          ? "var(--danger)"
                          : "var(--text-primary)",
                      }}
                    >
                      {f.lph}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {f.runtimeMin}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {f.drop}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 12,
                        fontFamily: "var(--font-rajdhani)",
                      }}
                    >
                      {iqd(f.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FOCard>
    </div>
  );
}
