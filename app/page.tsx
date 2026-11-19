import Scrapbook from "@/components/gallery/Scrapbook";
import { getGallery } from "@/lib/gallery";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Scrapbook {...await getGallery()} />;
}
