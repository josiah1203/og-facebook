import { useState } from "react";
import { useParams, Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import OGSidebar from "@/components/OGSidebar";
import PostCard from "@/components/PostCard";
import FriendCard from "@/components/FriendCard";
import { Loader2, GraduationCap, MapPin, Pencil, UserPlus, UserCheck } from "lucide-react";

type Tab = "posts" | "about" | "friends";

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const { user: currentUser, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editHometown, setEditHometown] = useState("");

  const profileId = id ? parseInt(id) : currentUser?.id;
  const isOwnProfile = currentUser?.id === profileId;

  const { data: profile, isLoading: profileLoading } = trpc.user.getById.useQuery(
    { id: profileId! },
    { enabled: !!profileId },
  );

  const { data: postsData } = trpc.post.listByUser.useQuery(
    { userId: profileId!, limit: 20 },
    { enabled: !!profileId },
  );

  const { data: friends } = trpc.friendship.listFriends.useQuery(
    { userId: profileId! },
    { enabled: !!profileId },
  );

  const { data: friendStatus } = trpc.friendship.isFriend.useQuery(
    { userId: profileId! },
    { enabled: !!profileId && !isOwnProfile },
  );

  const { data: mutualFriends } = trpc.friendship.listMutualFriends.useQuery(
    { userId: profileId! },
    { enabled: !!profileId && !isOwnProfile },
  );

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  const requestFriend = trpc.friendship.request.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: profileId! });
    },
  });

  const acceptFriend = trpc.friendship.accept.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: profileId! });
      utils.friendship.listFriends.invalidate({ userId: currentUser!.id });
    },
  });

  const removeFriend = trpc.friendship.remove.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: profileId! });
    },
  });

  const utils = trpc.useUtils();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  const handleEditSave = () => {
    updateProfile.mutate({
      bio: editBio || undefined,
      major: editMajor || undefined,
      hometown: editHometown || undefined,
    });
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-14 pb-10">
        {/* Cover */}
        <div className="h-48 md:h-56 w-full relative" style={{ backgroundColor: "var(--og-blue)" }}>
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 40px)`,
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 -mt-16 relative">
            <OGSidebar />

            <main className="flex-1">
              {/* Profile Hero */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name || "Profile"}
                      className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div
                      className="w-28 h-28 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md"
                      style={{ backgroundColor: "var(--og-blue-dark)" }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <h1
                      className="text-2xl md:text-3xl font-bold"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {profile.name}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <GraduationCap className="w-4 h-4" />
                      {profile.college}
                      {profile.gradYear && ` · Class of ${profile.gradYear}`}
                    </p>
                    {profile.bio && <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      {isOwnProfile ? (
                        <button
                          onClick={() => {
                            setEditBio(profile.bio || "");
                            setEditMajor(profile.major || "");
                            setEditHometown(profile.hometown || "");
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" /> Edit Profile
                        </button>
                      ) : (
                        <>
                          {friendStatus?.status === "accepted" ? (
                            <button
                              onClick={() => removeFriend.mutate({ friendId: profile.id })}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <UserCheck className="w-4 h-4" /> Friends
                            </button>
                          ) : friendStatus?.status === "pending_sent" ? (
                            <span className="px-4 py-2 rounded-md text-sm text-gray-500 border">
                              Request Sent
                            </span>
                          ) : friendStatus?.status === "pending_received" ? (
                            <button
                              onClick={() => acceptFriend.mutate({ requesterId: profile.id })}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                              style={{ backgroundColor: "var(--og-success)" }}
                            >
                              <UserCheck className="w-4 h-4" /> Confirm Request
                            </button>
                          ) : (
                            <button
                              onClick={() => requestFriend.mutate({ addresseeId: profile.id })}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                              style={{ backgroundColor: "var(--og-blue)" }}
                            >
                              <UserPlus className="w-4 h-4" /> Add Friend
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Modal */}
              {isEditing && (
                <div className="bg-white rounded-lg border shadow-sm p-6 mt-4">
                  <h3 className="text-base font-semibold mb-4">Edit Profile</h3>
                  <div className="space-y-3">
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Bio (max 200 chars)"
                      maxLength={200}
                      rows={3}
                      className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                    <input
                      type="text"
                      value={editMajor}
                      onChange={(e) => setEditMajor(e.target.value)}
                      placeholder="Major"
                      className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                    <input
                      type="text"
                      value={editHometown}
                      onChange={(e) => setEditHometown(e.target.value)}
                      placeholder="Hometown"
                      className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSave}
                        className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                        style={{ backgroundColor: "var(--og-blue)" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-6 mt-6 border-b">
                {(["posts", "about", "friends"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "text-gray-900 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="mt-4 space-y-4">
                {activeTab === "posts" && (
                  <>
                    {postsData?.posts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No posts yet.</p>
                      </div>
                    )}
                    {postsData?.posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </>
                )}

                {activeTab === "about" && (
                  <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
                    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                      <span className="text-gray-500">College</span>
                      <span className="text-gray-900">{profile.college}</span>
                    </div>
                    {profile.major && (
                      <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <span className="text-gray-500">Major</span>
                        <span className="text-gray-900">{profile.major}</span>
                      </div>
                    )}
                    {profile.gradYear && (
                      <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <span className="text-gray-500">Graduation</span>
                        <span className="text-gray-900">{profile.gradYear}</span>
                      </div>
                    )}
                    {profile.hometown && (
                      <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <span className="text-gray-500">Hometown</span>
                        <span className="text-gray-900 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {profile.hometown}
                        </span>
                      </div>
                    )}
                    {profile.bio && (
                      <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                        <span className="text-gray-500">Bio</span>
                        <span className="text-gray-900">{profile.bio}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "friends" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      {friends?.length || 0} friend{friends?.length !== 1 ? "s" : ""}
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {friends?.map((friend) => (
                        <FriendCard key={friend.id} user={friend} showMutual={false} />
                      ))}
                    </div>
                    {friends?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No friends yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>

            {/* Right Column */}
            <aside className="hidden xl:block w-72 shrink-0">
              <div className="sticky top-20 space-y-4">
                {mutualFriends && mutualFriends.length > 0 && (
                  <div className="bg-white rounded-lg border shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Mutual Friends ({mutualFriends.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {mutualFriends.slice(0, 6).map((f) => (
                        <Link key={f.id} to={`/profile/${f.id}`} className="text-center">
                          {f.avatarUrl ? (
                            <img src={f.avatarUrl} alt={f.name || "User"} className="w-12 h-12 rounded-full object-cover mx-auto" />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xs font-semibold mx-auto"
                              style={{ backgroundColor: "var(--og-blue-dark)" }}
                            >
                              {f.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                          )}
                          <p className="text-xs text-gray-600 mt-1 truncate">{f.name?.split(" ")[0]}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
