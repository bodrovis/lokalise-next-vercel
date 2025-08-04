import { NextResponse } from 'next/server';
import { LokaliseUpload } from "lokalise-file-exchange";
import path from "node:path";
import type {
  CollectFileParams,
  PartialUploadFileParams,
  ProcessUploadFileParams,
} from "lokalise-file-exchange";

const baseTag = "api";

export async function POST() {
  const apiKey = process.env.LOKALISE_API_KEY;
  const projectId = process.env.LOKALISE_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'Missing Lokalise credentials' },
      { status: 500 }
    );
  }

  try {
    const lokaliseUploader = new LokaliseUpload(
      { apiKey, enableCompression: true },
      { projectId: projectId }
    );

    const tag = `${baseTag}-${new Date().toISOString().split("T")[0]}`;

    console.log("Ready to upload with tag:", tag);

    const uploadFileParams: PartialUploadFileParams = {
      replace_modified: true,
      tags: [tag],
    };

    const collectFileParams: CollectFileParams = {
      inputDirs: ["./public/locales/en"],
      extensions: [".json"],
      recursive: true,
    };

    const processUploadFileParams: ProcessUploadFileParams = {
      pollStatuses: true,
      languageInferer: (filePath) => {
        try {
          const parentDir = path.dirname(filePath);
          const baseName = path.basename(parentDir);
          return baseName !== "locales" ? baseName : "";
        } catch {
          return "";
        }
      },
      filenameInferer: (filePath) => {
        const rel = path.relative(process.cwd(), filePath);
        return rel.replace(/^public[\\/]/, '').replace(/\\/g, '/');
      },
    };

    const { processes, errors } = await lokaliseUploader.uploadTranslations({
      uploadFileParams,
      collectFileParams,
      processUploadFileParams,
    });

    return NextResponse.json({ tag, processes, errors });
  } catch (err: any) {
    console.error('[upload-to-lokalise] failed:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
