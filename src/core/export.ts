// Scan sonuçlarını dışa aktarım — JSON / CSV / SARIF 2.1.0.
// SARIF GitHub Code Scanning'e yüklenebilir.

import { getScan } from "./scan";

type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface ExportResult {
  body: string;
  contentType: string;
  filename: string;
}

interface FindingRow {
  id: string;
  agent: string;
  severity: string;
  rule: string;
  file: string;
  line: number | null;
  why: string;
  fix: string | null;
  evidence: string | null;
}

export async function exportScan(
  scanId: string,
  format: "json" | "csv" | "sarif",
): Promise<ExportResult | null> {
  const scan = await getScan(scanId);
  if (!scan) return null;
  const stamp = scan.id.slice(0, 8);
  const findings = scan.findings as FindingRow[];

  if (format === "json") {
    return {
      body: JSON.stringify(scan, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `scan-${stamp}.json`,
    };
  }
  if (format === "csv") {
    return {
      body: toCsv(findings),
      contentType: "text/csv; charset=utf-8",
      filename: `scan-${stamp}.csv`,
    };
  }
  return {
    body: JSON.stringify(toSarif(scan.repo, scan.id, findings), null, 2),
    contentType: "application/sarif+json; charset=utf-8",
    filename: `scan-${stamp}.sarif`,
  };
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(findings: FindingRow[]): string {
  const header = ["severity", "agent", "file", "line", "rule", "why", "fix", "evidence"];
  const lines = [header.join(",")];
  for (const f of findings) {
    lines.push(
      [f.severity, f.agent, f.file, f.line ?? "", f.rule, f.why, f.fix ?? "", f.evidence ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

const SARIF_LEVEL: Record<Severity, "error" | "warning" | "note"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
  info: "note",
};

function toSarif(repo: string, scanId: string, findings: FindingRow[]) {
  const rules = new Map<string, { id: string; name: string; shortDescription: { text: string } }>();
  for (const f of findings) {
    const ruleId = `${f.agent}/${f.rule}`;
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: f.rule,
        shortDescription: { text: f.rule },
      });
    }
  }
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "orchestratorwin",
            version: "0.1.0",
            rules: [...rules.values()],
          },
        },
        properties: { scanId, repo },
        results: findings.map((f) => ({
          ruleId: `${f.agent}/${f.rule}`,
          level: SARIF_LEVEL[(f.severity as Severity)] ?? "warning",
          message: { text: f.why + (f.fix ? `\n\nfix: ${f.fix}` : "") },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file },
                region: f.line ? { startLine: f.line } : undefined,
              },
            },
          ],
          properties: { severity: f.severity, agent: f.agent },
        })),
      },
    ],
  };
}
