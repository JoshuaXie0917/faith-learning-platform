import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

const allowedAudioTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
];

function hasAllowedAudioExtension(pathname: string) {
  return /\.(mp3|m4a|wav|ogg|aac)$/i.test(pathname);
}

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,

      onBeforeGenerateToken: async (pathname) => {
        if (!hasAllowedAudioExtension(pathname)) {
          throw new Error("只允许上传 mp3、m4a、wav、ogg 或 aac 音频文件。");
        }

        return {
          allowedContentTypes: allowedAudioTypes,
          maximumSizeInBytes: MAX_AUDIO_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            type: "audio-upload",
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log("音频上传完成：", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "音频上传失败，请稍后再试。",
      },
      { status: 400 }
    );
  }
}