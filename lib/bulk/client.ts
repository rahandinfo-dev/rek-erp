"use client";

import type { BulkAction, BulkModule, BulkPayload, BulkJobSummary } from "@/lib/bulk/types";

export async function startBulkJob(input: {
  moduleKey: BulkModule;
  action: BulkAction;
  ids: string[];
  payload?: BulkPayload;
}): Promise<BulkJobSummary> {
  const res = await fetch("/api/bulk/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, autostart: true }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to start bulk job");
  return json.data as BulkJobSummary;
}

export async function processBulkJob(jobId: string): Promise<BulkJobSummary> {
  const res = await fetch(`/api/bulk/jobs/${jobId}/process`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Process failed");
  return json.data as BulkJobSummary;
}

export async function cancelBulkJob(jobId: string): Promise<BulkJobSummary> {
  const res = await fetch(`/api/bulk/jobs/${jobId}/cancel`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Cancel failed");
  return json.data as BulkJobSummary;
}

export async function undoBulkJob(jobId: string) {
  const res = await fetch(`/api/bulk/jobs/${jobId}/undo`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "پاشگەزبوونەوە سەرنەکەوت");
  return json.data;
}

export async function getBulkJob(jobId: string): Promise<BulkJobSummary> {
  const res = await fetch(`/api/bulk/jobs/${jobId}`, { cache: "no-store" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "نەدۆزرایەوە");
  return json.data as BulkJobSummary;
}

/** Poll until terminal status, processing batches along the way. */
export async function runBulkJobToCompletion(
  jobId: string,
  onProgress?: (job: BulkJobSummary) => void,
  signal?: AbortSignal
): Promise<BulkJobSummary> {
  let job = await getBulkJob(jobId);
  onProgress?.(job);

  const terminal = new Set([
    "completed",
    "failed",
    "cancelled",
    "partial",
  ]);

  while (!terminal.has(job.status) && !signal?.aborted) {
    job = await processBulkJob(jobId);
    onProgress?.(job);
    if (terminal.has(job.status)) break;
    await new Promise((r) => setTimeout(r, 120));
  }

  return job;
}
