import readsData from "@/data/reads.json";

export type ReadItem = {
  slug: string;
  title: string;
  author: string;
  date: string;
  note: string;
  topic: string;
  image: string;
  imageAlt: string;
  link: string;
};

const reads = readsData as ReadItem[];

export function getAllReads(): ReadItem[] {
  return reads;
}

export function getReadBySlug(slug: string): ReadItem | undefined {
  return reads.find((item) => item.slug === slug);
}
