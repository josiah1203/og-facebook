import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Send } from "lucide-react";

export default function PostComposer() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      setContent("");
      setIsExpanded(false);
      utils.post.listFeed.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createPost.mutate({ content: content.trim() });
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ backgroundColor: "var(--og-blue-dark)" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder="What's on your mind?"
              rows={isExpanded ? 3 : 1}
              className="w-full resize-none text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent"
              maxLength={2000}
            />
          </div>
        </div>
        {(isExpanded || content) && (
          <>
            <div className="border-t my-3" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">{content.length}/2000</span>
              <button
                type="submit"
                disabled={!content.trim() || createPost.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                style={{ backgroundColor: "var(--og-blue)" }}
              >
                <Send className="w-4 h-4" />
                {createPost.isPending ? "Posting..." : "Post"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
