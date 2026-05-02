function deliveryTimeoutMs(): number {
  const n = Number(process.env.CIS_DELIVERY_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 120_000;
}

function ddexJsonEnvelope(xml: string): string {
  const v = (process.env.DDEX_ERN_VERSION ?? "382").trim().toLowerCase();
  const is43 = v === "43" || v === "ern/43" || v === "4.3" || v === "ern43";
  const format = is43 ? "ddex-ern-43" : "ddex-ern-382";
  return JSON.stringify({
    ddexXml: xml,
    format,
    ern43Xml: xml,
    ern382Xml: xml,
  });
}

export type PushXmlResult = { ok: true; status: number } | { ok: false; status?: number; error: string };

export async function pushDdexToPartner(
  url: string,
  xml: string,
  headers: Record<string, string>,
  bodyMode: "xml" | "json"
): Promise<PushXmlResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), deliveryTimeoutMs());
  try {
    let body: string;
    const outHeaders: Record<string, string> = { ...headers };

    if (bodyMode === "json") {
      outHeaders["Content-Type"] = "application/json; charset=utf-8";
      body = ddexJsonEnvelope(xml);
    } else {
      outHeaders["Content-Type"] = "application/xml; charset=utf-8";
      body = xml;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: outHeaders,
      body,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: text.trim().slice(0, 800) || res.statusText || `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg === "This operation was aborted") {
      return { ok: false, error: `Timeout sau ${deliveryTimeoutMs()}ms` };
    }
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}
