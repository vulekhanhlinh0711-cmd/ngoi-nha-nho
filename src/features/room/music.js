// P2.06–P2.07: đổi link YouTube / Spotify thành địa chỉ nhúng.
export function youtubeEmbed(link) {
  let url;
  try { url = new URL(link.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  const list = url.searchParams.get('list');
  const video = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') ?? url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1];
  const safe = (s) => (s && /^[\w-]+$/.test(s) ? s : null);
  // P51: danh sách video app tự ghép (playlist riêng tư / bỏ video bị chặn): ?v=đầu&vids=a,b,c
  const vids = (url.searchParams.get('vids') ?? '').split(',').filter((x) => safe(x));
  if (safe(video) && vids.length) return `https://www.youtube-nocookie.com/embed/${video}?playlist=${vids.join(',')}`;
  if (safe(video)) return `https://www.youtube-nocookie.com/embed/${video}${safe(list) ? `?list=${list}` : ''}`;
  if (safe(list)) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
  return null;
}

export function spotifyEmbed(link) {
  let url;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.hostname !== 'open.spotify.com') return null;
  const m = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}
