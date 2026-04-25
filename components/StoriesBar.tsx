import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

type StoryGroup = {
  userId: number;
  user: { id: number; name: string; avatarUrl?: string | null };
  stories: Array<{
    id: number;
    content: string | null;
    imageUrl: string | null;
    bgColor: string;
    createdAt: Date | string;
    expiresAt: Date | string;
  }>;
};

function UserAvatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0`} style={{ backgroundColor: "var(--og-blue-dark)" }}>
      {initials}
    </div>
  );
}

function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const story = group.stories[index];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="flex gap-1 mb-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full" style={{ backgroundColor: i <= index ? "white" : "rgba(255,255,255,0.4)" }} />
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <UserAvatar name={group.user.name} url={group.user.avatarUrl} size="sm" />
          <span className="text-white text-sm font-medium">{group.user.name}</span>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story content */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: "9/16", maxHeight: "70vh", backgroundColor: story.bgColor }}
        >
          {story.imageUrl ? (
            <img src={story.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <p className="text-white text-center text-lg font-medium leading-snug">{story.content}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="text-white/70 hover:text-white disabled:opacity-30 p-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(group.stories.length - 1, i + 1))}
            disabled={index === group.stories.length - 1}
            className="text-white/70 hover:text-white disabled:opacity-30 p-2"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [bgColor, setBgColor] = useState("#3B5998");

  const create = trpc.story.create.useMutation({
    onSuccess: () => { onCreated(); onClose(); },
  });

  const colors = ["#3B5998", "#E74C3C", "#27AE60", "#8E44AD", "#F39C12", "#1ABC9C", "#2C3E50"];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>Create Story</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Preview */}
        <div
          className="w-full rounded-lg mb-4 flex items-center justify-center"
          style={{ height: 160, backgroundColor: bgColor }}
        >
          <p className="text-white text-center px-4 text-sm font-medium">{content || "Your story..."}</p>
        </div>

        {/* Color picker */}
        <div className="flex gap-2 mb-3">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setBgColor(c)}
              className="w-7 h-7 rounded-full border-2 shrink-0"
              style={{ backgroundColor: c, borderColor: bgColor === c ? "white" : "transparent", outline: bgColor === c ? `2px solid ${c}` : "none" }}
            />
          ))}
        </div>

        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "var(--og-blue)" } as React.CSSProperties}
          rows={3}
          placeholder="What's on your mind?"
          maxLength={200}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="text-right text-xs text-gray-400 mb-3">{content.length}/200</div>

        <button
          onClick={() => create.mutate({ content: content || undefined, bgColor })}
          disabled={create.isPending || !content.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--og-blue)" }}
        >
          {create.isPending ? "Posting..." : "Share Story"}
        </button>
      </div>
    </div>
  );
}

export default function StoriesBar() {
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const utils = trpc.useUtils();

  const { data: storyGroups = [], isLoading } = trpc.story.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-24 h-36 rounded-xl bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
        {/* Create story card */}
        <button
          onClick={() => setCreating(true)}
          className="shrink-0 w-24 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center transition-colors hover:bg-gray-50"
          style={{ borderColor: "var(--og-border)", color: "var(--og-blue)" }}
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--og-blue)" }}>
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-medium leading-tight" style={{ color: "var(--og-text-secondary)" }}>
            Create Story
          </span>
        </button>

        {/* Friend story cards */}
        {(storyGroups as StoryGroup[]).map((group) => (
          <button
            key={group.userId}
            onClick={() => setViewingGroup(group)}
            className="shrink-0 w-24 h-36 rounded-xl overflow-hidden relative text-left"
          >
            {/* Background */}
            {group.stories[0].imageUrl ? (
              <img src={group.stories[0].imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: group.stories[0].bgColor }} />
            )}

            {/* Text preview if no image */}
            {!group.stories[0].imageUrl && group.stories[0].content && (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <p className="text-white text-xs text-center font-medium line-clamp-4 leading-tight">
                  {group.stories[0].content}
                </p>
              </div>
            )}

            {/* Avatar ring at top */}
            <div className="absolute top-2 left-2 p-0.5 rounded-full" style={{ backgroundColor: "var(--og-blue)" }}>
              <UserAvatar name={group.user.name} url={group.user.avatarUrl} size="sm" />
            </div>

            {/* Name at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-4">
              <p className="text-white text-xs font-medium truncate">{group.user.name.split(" ")[0]}</p>
            </div>

            {/* Count badge */}
            {group.stories.length > 1 && (
              <div className="absolute top-2 right-2 bg-white/90 rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ color: "var(--og-blue)", fontSize: "10px" }}>
                {group.stories.length}
              </div>
            )}
          </button>
        ))}
      </div>

      {viewingGroup && (
        <StoryViewer group={viewingGroup} onClose={() => setViewingGroup(null)} />
      )}

      {creating && (
        <CreateStoryModal
          onClose={() => setCreating(false)}
          onCreated={() => utils.story.list.invalidate()}
        />
      )}
    </>
  );
}
