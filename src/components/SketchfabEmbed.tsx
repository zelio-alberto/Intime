// Embed 3D do Sketchfab (iframe), responsivo. Mantém o crédito ao autor para
// cumprir a licença do modelo.
export default function SketchfabEmbed({
  modelId, title, author, authorUrl,
}: { modelId: string; title: string; author: string; authorUrl: string }) {
  const src = `https://sketchfab.com/models/${modelId}/embed?autospin=0.3&autostart=1&preload=1&ui_theme=dark&ui_infos=0&ui_hint=0`;
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <iframe
          title={title}
          src={src}
          className="w-full h-full"
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
        />
      </div>
      <p className="text-[9px] text-muted/50 px-2 py-1 text-center truncate">
        3D “{title}” por{" "}
        <a href={authorUrl} target="_blank" rel="nofollow noreferrer" className="hover:text-muted">{author}</a>
        {" "}· Sketchfab
      </p>
    </div>
  );
}
