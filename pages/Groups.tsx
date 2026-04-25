import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Users, Plus, Lock, Globe, X, Loader2 } from "lucide-react";

function GroupCard({ group, showJoin = false }: { group: any; showJoin?: boolean }) {
  const utils = trpc.useUtils();
  const join = trpc.group.join.useMutation({
    onSuccess: () => {
      utils.group.listMine.invalidate();
      utils.group.discover.invalidate();
    },
  });

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover placeholder */}
      <div
        className="h-24 w-full"
        style={{
          background: group.coverUrl
            ? `url(${group.coverUrl}) center/cover`
            : "linear-gradient(135deg, var(--og-blue) 0%, var(--og-blue-dark) 100%)",
        }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              {group.privacy === "private" ? (
                <Lock className="w-3 h-3 text-gray-400" />
              ) : (
                <Globe className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-xs text-gray-400 capitalize">{group.privacy}</span>
              <span className="text-gray-300 mx-1">·</span>
              <Users className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{group.memberCount}</span>
            </div>
          </div>

          {showJoin ? (
            <button
              onClick={() => join.mutate({ groupId: group.id })}
              disabled={join.isPending}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              {join.isPending ? "..." : "Join"}
            </button>
          ) : (
            <Link
              to={`/groups/${group.id}`}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
              style={{ color: "var(--og-blue)", borderColor: "var(--og-blue)" }}
            >
              View
            </Link>
          )}
        </div>

        {group.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{group.description}</p>
        )}
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const utils = trpc.useUtils();

  const create = trpc.group.create.useMutation({
    onSuccess: () => {
      utils.group.listMine.invalidate();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Create Group
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--og-blue)" } as React.CSSProperties}
              placeholder="e.g. Computer Science 2028"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": "var(--og-blue)" } as React.CSSProperties}
              placeholder="What's this group about?"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
            <div className="flex gap-3">
              {(["public", "private"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPrivacy(p)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    privacy === p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => create.mutate({ name: name.trim(), description: description.trim() || undefined, privacy })}
          disabled={create.isPending || name.trim().length < 3}
          className="mt-6 w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--og-blue)" }}
        >
          {create.isPending ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}

export default function Groups() {
  const { isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [showCreate, setShowCreate] = useState(false);

  const { data: myGroups = [], isLoading: loadingMine } = trpc.group.listMine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: discover = [], isLoading: loadingDiscover } = trpc.group.discover.useQuery(undefined, { enabled: isAuthenticated });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-20 pb-20 md:pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-primary)" }}>
                Groups
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--og-text-muted)" }}>
                Connect with your campus communities
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Group</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          {/* My Groups */}
          <section className="mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Your Groups</h2>
            {loadingMine ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border h-40 animate-pulse" />
                ))}
              </div>
            ) : (myGroups as any[]).length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">You haven't joined any groups yet.</p>
                <p className="text-xs text-gray-400 mt-1">Discover groups below or create your own.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(myGroups as any[]).map((g: any) => (
                  <GroupCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </section>

          {/* Discover */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Discover</h2>
            {loadingDiscover ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border h-40 animate-pulse" />
                ))}
              </div>
            ) : (discover as any[]).length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No new groups to discover right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(discover as any[]).map((g: any) => (
                  <GroupCard key={g.id} group={g} showJoin />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      <MobileBottomNav />
    </div>
  );
}
