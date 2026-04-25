import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { ThumbsUp, MessageCircle, Send, Trash2 } from "lucide-react";

interface PostWithData {
  id: number;
  content: string;
  createdAt: Date;
  userId: number;
  author: {
    id: number;
    name: string | null;
    avatarUrl?: string | null;
    college?: string | null;
  };
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
}

export default function PostCard({ post }: { post: PostWithData }) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  const likeMutation = trpc.like.toggle.useMutation({
    onSuccess: () => {
      utils.post.listFeed.invalidate();
    },
  });

  const commentMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.post.listFeed.invalidate();
      utils.comment.listByPost.invalidate({ postId: post.id });
    },
  });

  const deletePost = trpc.post.delete.useMutation({
    onSuccess: () => {
      utils.post.listFeed.invalidate();
    },
  });

  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.listByPost.invalidate({ postId: post.id });
      utils.post.listFeed.invalidate();
    },
  });

  const { data: comments } = trpc.comment.listByPost.useQuery(
    { postId: post.id },
    { enabled: showComments },
  );

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOwnPost = user?.id === post.userId;

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to={isOwnPost ? "/profile" : `/profile/${post.author.id}`}>
            <Avatar name={post.author.name || ""} url={post.author.avatarUrl} size="md" />
          </Link>
          <div>
            <Link
              to={isOwnPost ? "/profile" : `/profile/${post.author.id}`}
              className="text-sm font-semibold hover:underline"
              style={{ color: "var(--og-blue)" }}
            >
              {post.author.name || "Unknown"}
            </Link>
            <p className="text-xs text-gray-400">{formatTime(post.createdAt)}</p>
          </div>
        </div>
        {isOwnPost && (
          <button
            onClick={() => deletePost.mutate({ id: post.id })}
            className="text-xs text-red-500 hover:text-red-700 opacity-0 hover:opacity-100 transition-opacity"
          >
            Delete
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 border-t flex items-center gap-6">
        <button
          onClick={() => likeMutation.mutate({ postId: post.id })}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.hasLiked ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${post.hasLiked ? "fill-current" : ""}`} />
          <span>{post.likeCount > 0 ? post.likeCount : "Like"}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount > 0 ? post.commentCount : "Comment"}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-4 border-t">
          <div className="mt-3 space-y-3">
            {comments?.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar name={comment.author?.name || ""} url={comment.author?.avatarUrl} size="sm" />
                <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{comment.author?.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{comment.content}</p>
                    </div>
                    {user?.id === comment.userId && (
                      <button
                        onClick={() => deleteComment.mutate({ id: comment.id })}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Comment Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                commentMutation.mutate({ postId: post.id, content: commentText.trim() });
              }}
              className="flex gap-2 mt-2"
            >
              <Avatar name={user?.name || ""} url={user?.avatarUrl} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 text-sm px-3 py-1.5 rounded-full border bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className="p-1.5 rounded-full text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--og-blue)" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-28 h-28 text-xl",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ backgroundColor: "var(--og-blue-dark)" }}
    >
      {initials}
    </div>
  );
}
