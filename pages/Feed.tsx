import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import OGSidebar from "@/components/OGSidebar";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import StoriesBar from "@/components/StoriesBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Loader2 } from "lucide-react";

export default function Feed() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.listFeed.useInfiniteQuery(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isAuthenticated,
      },
    );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-20 pb-20 md:pb-10 px-4">
        <div className="max-w-6xl mx-auto flex gap-6">
          <OGSidebar />

          <main className="flex-1 max-w-xl mx-auto lg:mx-0 w-full">
            {/* Stories */}
            {isAuthenticated && <StoriesBar />}

            <div className="mb-4">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-primary)" }}
              >
                Your Wall
              </h2>
              <p className="text-xs" style={{ color: "var(--og-text-muted)" }}>
                Latest from your friends — in order
              </p>
            </div>

            <div className="space-y-4">
              {isAuthenticated && <PostComposer />}

              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/4" />
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="h-3 bg-gray-200 rounded" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && allPosts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-lg" style={{ color: "var(--og-text-secondary)" }}>
                    Your Wall is quiet.
                  </p>
                  <p className="text-sm mt-2" style={{ color: "var(--og-text-muted)" }}>
                    Be the first to post or find friends to connect with.
                  </p>
                  <button
                    onClick={() => navigate("/friends")}
                    className="mt-4 px-4 py-2 rounded-md text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: "var(--og-blue)" }}
                  >
                    Find Friends
                  </button>
                </div>
              )}

              {allPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {hasNextPage && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 rounded-md text-sm font-medium border transition-colors hover:bg-gray-50 disabled:opacity-50"
                    style={{ color: "var(--og-blue)", borderColor: "var(--og-border)" }}
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </main>

          {/* Right sidebar - desktop only */}
          <aside className="hidden xl:block w-72 shrink-0">
            <div className="sticky top-20">
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Campus Pulse</h3>
                <div className="space-y-2 text-sm text-gray-500">
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {user?.college || "Your college"}
                  </p>
                  <p>{allPosts.length} posts on your wall</p>
                </div>
                <div
                  className="mt-4 px-3 py-2 rounded-md text-xs font-medium text-center"
                  style={{ backgroundColor: "rgba(66,183,42,0.1)", color: "var(--og-success)" }}
                >
                  OG is 100% ad-free
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
