import { photoResponse } from "@/lib/media";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return photoResponse(
    (await params).id,
    new URL(req.url).searchParams.get("size") === "small",
  );
}
