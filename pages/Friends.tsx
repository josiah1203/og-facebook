import { useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import OGSidebar from "@/components/OGSidebar";
import FriendCard from "@/components/FriendCard";
import { Loader2, Search, Check, X } from "lucide-react";

type Tab = "friends" | "requests" | "find";

export default function Friends() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search");

  if (initialSearch && activeTab !== "find") {
    setActiveTab("find");
    setSearchQuery(initialSearch);
  }

  const { data: friends, isLoading: friendsLoading } = trpc.friendship.listFriends.useQuery(
    { userId: user?.id! },
    { enabled: isAuthenticated && !!user },
  );

  const { data: requests, isLoading: requestsLoading } = trpc.friendship.listRequests.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "requests" },
  );

  const { data: pending } = trpc.friendship.listPending.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "friends" },
  );

  const { data: searchResults } = trpc.user.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: isAuthenticated && activeTab === "find" && searchQuery.length > 0 },
  );

  const { data: collegeUsers } = trpc.user.listByCollege.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated && activeTab === "find" && searchQuery.length === 0 },
  );

  const utils = trpc.useUtils();

  const acceptMutation = trpc.friendship.accept.useMutation({
    onSuccess: () => {
      utils.friendship.listRequests.invalidate();
      utils.friendship.listFriends.invalidate({ userId: user!.id });
    },
  });

  const rejectMutation = trpc.friendship.reject.useMutation({
    onSuccess: () => {
      utils.friendship.listRequests.invalidate();
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  const displayUsers = activeTab === "find" && searchQuery.length > 0
    ? searchResults
    : collegeUsers;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-20 pb-10 px-4">
        <div className="max-w-6xl mx-auto flex gap-6">
          <OGSidebar />

          <main className="flex-1 max-w-2xl mx-auto lg:mx-0 w-full">
            <div className="mb-6">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-primary)" }}
              >
                Friends
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b mb-6">
              {(["friends", "requests", "find"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "text-gray-900 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "find" ? "Find People" : tab}
                  {tab === "requests" && requests && requests.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs text-white" style={{ backgroundColor: "var(--og-error)" }}>
                      {requests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Find People Search */}
            {activeTab === "find" && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="space-y-4">
              {activeTab === "friends" && (
                <>
                  {friendsLoading && <LoadingSkeleton count={3} />}
                  {friends && friends.length === 0 && pending && pending.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">You haven't connected with anyone yet.</p>
                      <button
                        onClick={() => setActiveTab("find")}
                        className="mt-3 px-4 py-2 rounded-md text-sm font-medium text-white"
                        style={{ backgroundColor: "var(--og-blue)" }}
                      >
                        Find your classmates
                      </button>
                    </div>
                  )}

                  {pending && pending.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Pending Requests</h3>
                      <div className="space-y-3">
                        {pending.map((req) => (
                          <FriendCard key={req.id} user={req.addressee!} showMutual={false} />
                        ))}
                      </div>
                    </div>
                  )}

                  {friends && friends.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {friends.map((friend) => (
                        <FriendCard key={friend.id} user={friend} showMutual={false} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "requests" && (
                <>
                  {requestsLoading && <LoadingSkeleton count={3} />}
                  {requests && requests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No pending requests.</p>
                    </div>
                  )}
                  {requests && requests.length > 0 && (
                    <div className="space-y-4">
                      {requests.map((req) => (
                        <div key={req.id} className="bg-white rounded-lg border shadow-sm p-4 flex items-center gap-4">
                          <div className="flex-1">
                            <FriendCard user={req.requester!} showMutual={false} />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptMutation.mutate({ requesterId: req.requesterId })}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white"
                              style={{ backgroundColor: "var(--og-success)" }}
                            >
                              <Check className="w-4 h-4" /> Confirm
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate({ requesterId: req.requesterId })}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" /> Ignore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === "find" && (
                <>
                  {displayUsers && displayUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>{searchQuery ? "No users found." : "No classmates to show yet."}</p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {displayUsers?.map((u) => (
                      <FriendCard
                        key={u.id}
                        user={u}
                        showMutual={true}
                        mutualCount={friends?.filter((f) => f.id === u.id).length ? 0 : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border p-4 animate-pulse flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
