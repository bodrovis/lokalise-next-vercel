import { NextRequest, NextResponse } from 'next/server';
import type {
  DownloadFileParams,
  WebhookProjectTaskClosed,
} from "@lokalise/node-api";
import type {
  ExtractParams
} from "lokalise-file-exchange";
import {
  LokaliseDownload
} from "lokalise-file-exchange";
import { LokaliseApi } from "@lokalise/node-api";
import { readdir } from "fs/promises";
import path from "path";

const lokaliseProjectId = process.env.LOKALISE_PROJECT_ID!;
const lokaliseWebhooksSecret = process.env.LOKALISE_WEBHOOK_SECRET!;
const apiKey = process.env.LOKALISE_API_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const headers = req.headers;

  if (headers.get('x-secret') !== lokaliseWebhooksSecret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  if (Array.isArray(body) && body[0] === 'ping') {
    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
  }

  if (typeof body === 'object' && body !== null) {
    const webhookPayload = body as WebhookProjectTaskClosed;

    if (
      webhookPayload.event === 'project.task.closed' &&
      webhookPayload.project.id === lokaliseProjectId
    ) {
      console.log(
        `🟢 Task "${webhookPayload.task.title}" (ID ${webhookPayload.task.id}) closed ` +
        `in project "${webhookPayload.project.name}".`
      );

      const langs = await getTaskTargetLanguages(webhookPayload.task.id);

      await downloadFromLokalise(langs);

      return new Response(JSON.stringify({ status: 'task processed' }), { status: 200 });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
}

async function getTaskTargetLanguages(taskId: number): Promise<string[]> {
  const lokaliseApi = new LokaliseApi({ apiKey });
  // Request full details for the task we just received in the webhook
  const task = await lokaliseApi
    .tasks()
    .get(taskId, { project_id: lokaliseProjectId });
  // Each element in task.languages has a language_iso field (e.g. "fr", "es")
  return task.languages.map((lang) => lang.language_iso);
}

async function downloadFromLokalise(downloadLangs: string[]) {
  const downloadFileParams: DownloadFileParams = {
    format: "json",            // Request JSON output
    original_filenames: true,  // Keep the same filenames we uploaded (en.json, main.json, …)
    indentation: "2sp",        // JSON with two-space indents
    directory_prefix: "",      // No extra prefix inside the archive
    filter_data: ["translated"],   // Export only segments with a translation
    filter_langs: downloadLangs,   // Languages we got from getTaskTargetLanguages()
  };

  const extractParams: ExtractParams = {
    outputDir: "/tmp",
  };

  try {
    const lokaliseDownloader = new LokaliseDownload(
      { apiKey, enableCompression: true },
      { projectId: lokaliseProjectId }
    );

    console.log("Starting download…");
    console.log("Languages:", downloadLangs.join(", "));

    await lokaliseDownloader.downloadTranslations({
      downloadFileParams,
      extractParams,
    });

    console.log("Download completed successfully!");

    console.log("Dumping /tmp:");
    await logDirRecursive("/tmp");
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
}

async function logDirRecursive(dir: string, indent = ""): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const isDir = entry.isDirectory();
    const type = isDir ? "📁" : "📄";
    console.log(`${indent}${type} ${entry.name}`);

    if (isDir) {
      await logDirRecursive(fullPath, indent + "  ");
    }
  }
}