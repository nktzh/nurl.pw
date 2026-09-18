import type { Metadata } from "next";
import { DropView } from "@/features/drop-view/DropView";

export const metadata: Metadata = {
  title: "Папка | Nurl",
  robots: { index: false },
};

export default async function DropPage({ params }: PageProps<"/d/[key]">) {
  const { key } = await params;
  return <DropView dropKey={decodeURIComponent(key)} />;
}
