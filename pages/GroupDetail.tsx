import { useState } from "react";
import { useParams, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import PostCard from "@/components/PostCard";
import { Users, Lock, Globe, UserPlus, UserMinus, Loader2, Send } from "lucide-react";

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base" }[size];
  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-semibold shrink-0`} style={{ backgroundColor: "var(--og-blue-dark)" }}>
      {initials}
    </div>
  );
}

function GroupPostComposer({ groupId }: { groupId: number }) {
  const [content, setContent] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.group.createPost.useMutation({
    onSuccess: () => {
      setContent("");
      utils.group.listPosts.invalidate({ groupId });
    },
  });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
      <textarea
        className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": "var(--og-blue)" } as React.CSSProperties}
        placeholder="Write something to the group..."
        rows={3}
        maxLength={2000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={() => create.mutate({ groupId, content: content.trim() })}
          disabled={create.isPending || !content.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--og-blue)" }}
        >
          <Send className="w-4 h-4" />
          {create.isPending ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}

type Tab = "posts" | "members" | "about";

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [tab, setTab] = useState<Tab>("posts");
  const utils = trpc.useUtils();

  const { data: group, isLoading: groupLoading } = trpc.group.getById.useQuery(
    { id: groupId },
    { enabled: isAuthenticated && !!groupId },
  );

  const { data: postsData, isLoading: postsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.group.listPosts.useInfiniteQuery(
      { groupId, limit: 20 },
      {
        getNextPageParam: (p) => p.nextCursor,
        enabled: isAuthenticated && !!groupId && tab === "posts",
      },
    );

  const { data: members = [], isLoading: membersLoading } = trpc.group.listMembers.useQuery(
    { groupId },
    { enabled: isAuthenticated && !!groupId && tab === "members" },
  );

  const join = trpc.group.join.useMutation({
    onSuccess: () => utils.group.getById.invalidate({ id: groupId }),
  });
  const leave = trpc.group.leave.useMutation({
    onSuccess: () => utils.group.getById.invalidate({ id: groupId }),
  });

  if (authLoading || groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Group not found.</p>
          <Link to="/groups" className="text-sm mt-2 block" style={{ color: "var(--og-blue)" }}>← Back to Groups</Link>
        </div>
      </div>
    );
  }

  const allPosts = postsData?.pages.flatMap((p) => p.posts) ?? [];
  const isAdmin = group.memberRole === "admin";

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "members", label: `Members (${group.memberCount})` },
    { key: "about", label: "About" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-14">
        {/* Cover photo */}
        <div
          className="w-full h-48 md:h-64 relative"
          style={{
            background: group.coverUrl
              ? `url(${group.coverUrl}) center/cover`
              : "linear-gradient(135deg, var(--og-blue) 0%, var(--og-blue-dark) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Group info bar */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {group.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {group.privacy === "private" ? (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Lock className="w-3 h-3" /> Private Group
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Globe className="w-3 h-3" /> Public Group
                    </span>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" /> {group.memberCount} members
                  </span>
                  {isAdmin && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "var(--og-blue)" }}>Admin</span>
                    </>
                  )}
                </div>
              </div>

              {group.isMember ? (
                <button
                  onClick={() => leave.mutate({ groupId })}
                  disabled={leave.isPending || isAdmin}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title={isAdmin ? "Admins cannot leave" : undefined}
                >
                  <UserMinus className="w-4 h-4" />
                  {leave.isPending ? "Leaving..." : "Leave"}
                </button>
              ) : (
                <button
                  onClick={() => join.mutate({ groupId })}
                  disabled={join.isPending}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--og-blue)" }}
                >
                  <UserPlus className="w-4 h-4" />
                  {join.isPending ? "Joining..." : "Join Group"}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 border-b -mb-px">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-10">
          {tab === "posts" && (
            <div className="max-w-xl">
              {group.isMember && <GroupPostComposer groupId={groupId} />}

              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : allPosts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border">
                  <p className="text-gray-500 text-sm">No posts yet.</p>
                  {group.isMember && (
                    <p className="text-gray-400 text-xs mt-1">Be the first to post something!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {allPosts.map((post) => (
                    <PostCard key={post.id} post={post as any} />
                  ))}
                  {hasNextPage && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-6 py-2 rounded-md text-sm font-medium border hover:bg-gray-50 disabled:opacity-50"
                        style={{ color: "var(--og-blue)", borderColor: "var(--og-border)" }}
                      >
                        {isFetchingNextPage ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "members" && (
            <div>
              {membersLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(members as any[]).map((m: any) => (
                    <Link
                      key={m.userId}
                      to={`/profile/${m.userId}`}
                      className="bg-white rounded-xl border p-4 text-center hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-center mb-2">
                        <Avatar name={m.user?.name || "?"} url={m.user?.avatarUrl} size="lg" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.user?.name}</p>
                      {m.role === "admin" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white mt-1 inline-block" style={{ backgroundColor: "var(--og-blue)" }}>Admin</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "about" && (
            <div className="max-w-xl">
              <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-sm text-gray-600">{group.description || "No description provided."}</p>
                </div>
                <div className="border-t pt-4" style={{ borderColor: "var(--og-border)" }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Privacy</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {group.privacy === "private" ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    <span className="capitalize">{group.privacy}</span>
                  </div>
                </div>
                <div className="border-t pt-4" style={{ borderColor: "var(--og-border)" }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Created</h3>
                  <p className="text-sm text-gray-600">{new Date(group.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
