import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import OGHeader from "@/components/OGHeader";
import OGSidebar from "@/components/OGSidebar";
import { Loader2, Trash2, GraduationCap, Mail } from "lucide-react";

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [bio, setBio] = useState(user?.bio || "");
  const [major, setMajor] = useState(user?.major || "");
  const [hometown, setHometown] = useState(user?.hometown || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const utils = trpc.useUtils();

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.ogAuth.me.invalidate();
      utils.user.getById.invalidate({ id: user!.id });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--og-blue)" }} />
      </div>
    );
  }

  const handleSaveProfile = () => {
    updateProfile.mutate({
      bio: bio || undefined,
      major: major || undefined,
      hometown: hometown || undefined,
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--og-warm-white)" }}>
      <OGHeader />

      <div className="pt-20 pb-10 px-4">
        <div className="max-w-6xl mx-auto flex gap-6">
          <OGSidebar />

          <main className="flex-1 max-w-xl mx-auto lg:mx-0 w-full">
            <div className="mb-6">
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "var(--og-text-primary)" }}
              >
                Settings
              </h2>
            </div>

            <div className="space-y-6">
              {/* Profile Settings */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Profile</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell your campus about yourself..."
                      maxLength={200}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">{bio.length}/200</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Major
                    </label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="e.g., Computer Science"
                      className="w-full px-4 py-2.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Hometown
                    </label>
                    <input
                      type="text"
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      placeholder="e.g., Boston, MA"
                      className="w-full px-4 py-2.5 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfile.isPending}
                    className="px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: "var(--og-blue)" }}
                  >
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </button>

                  {updateProfile.isSuccess && (
                    <p className="text-xs text-green-600">Profile updated successfully.</p>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Account</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="text-gray-900">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500">College</p>
                      <p className="text-gray-900">{user?.college}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-base font-semibold text-red-600 mb-4">Danger Zone</h3>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">
                      Are you sure? This will permanently delete your account and all your data. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
