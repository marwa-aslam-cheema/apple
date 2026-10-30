export const fmt = (n: number) => n.toLocaleString("en-US");
export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
