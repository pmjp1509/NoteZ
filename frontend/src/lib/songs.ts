import { supabase } from "@/config/supabase";

export type SongItem = {
  movie: string;
  name: string;
  path: string; // usually the backend song id or storage path
  coverUrl: string;
  audioUrl: string;
  lyrics?: string;
  id?: string;
};

async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

export async function fetchRandomSongs(limit: number): Promise<SongItem[]> {
  console.log("[songs] fetchRandomSongs called with limit:", limit);
  const bucket = "songs";
  const { data: root, error } = await supabase.storage.from(bucket).list("", { limit: 1000, offset: 0 });
  if (error) throw error;
  console.log("[songs] root entries:", root?.map(e => e.name));
  const movieFolders = (root || []).filter((e) => e.name && e.metadata === null);
  const allSongs: SongItem[] = [];
  for (const folder of movieFolders) {
    const prefix = `${folder.name}/`;
    const { data: entries } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset: 0 });
    console.log(`[songs] folder ${prefix} entries:`, entries?.map(e => e.name));
    const coverEntry = entries?.find((e) => e.name.toLowerCase().startsWith("cover"))?.name;
    const coverPath = coverEntry ? `${prefix}${coverEntry}` : undefined;
    const coverUrl = coverPath ? await getSignedUrl(bucket, coverPath) : "/assets/album-placeholder.jpg";
    for (const file of entries || []) {
      if (file.name.toLowerCase().endsWith(".mp3")) {
        const audioPath = `${prefix}${file.name}`;
        const audioUrl = await getSignedUrl(bucket, audioPath);
        console.log(`[songs] mp3 found:`, audioPath, Boolean(audioUrl));
        allSongs.push({
          movie: folder.name,
          name: file.name.replace(/\.mp3$/i, ""),
          path: audioPath,
          coverUrl,
          audioUrl,
        });
      }
    }
  }
  for (let i = allSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
  }
  console.log(`[songs] total mp3 collected:`, allSongs.length);
  return allSongs.slice(0, limit);
}


