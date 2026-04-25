import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, Check, UserCheck } from "lucide-react";

interface FriendCardProps {
  user: {
    id: number;
    name: string | null;
    college?: string | null;
    avatarUrl?: string | null;
  };
  showMutual?: boolean;
  mutualCount?: number;
  onAction?: () => void;
}

export default function FriendCard({ user, showMutual = true, mutualCount, onAction }: FriendCardProps) {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();

  const { data: friendStatus } = trpc.friendship.isFriend.useQuery(
    { userId: user.id },
    { enabled: !!currentUser && currentUser.id !== user.id },
  );

  const requestMutation = trpc.friendship.request.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: user.id });
      utils.friendship.listPending.invalidate();
      onAction?.();
    },
  });

  const acceptMutation = trpc.friendship.accept.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: user.id });
      utils.friendship.listRequests.invalidate();
      utils.friendship.listFriends.invalidate({ userId: currentUser!.id });
      onAction?.();
    },
  });

  const removeMutation = trpc.friendship.remove.useMutation({
    onSuccess: () => {
      utils.friendship.isFriend.invalidate({ userId: user.id });
      utils.friendship.listFriends.invalidate({ userId: currentUser!.id });
      onAction?.();
    },
  });

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isSelf = currentUser?.id === user.id;

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center gap-4">
      <Link to={isSelf ? "/profile" : `/profile/${user.id}`}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name || "User"} className="w-14 h-14 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
            style={{ backgroundColor: "var(--og-blue-dark)" }}
          >
            {initials}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={isSelf ? "/profile" : `/profile/${user.id}`}
          className="text-sm font-semibold text-gray-900 hover:underline block truncate"
        >
          {user.name}
        </Link>
        <p className="text-xs text-gray-500">{user.college}</p>
        {showMutual && mutualCount !== undefined && mutualCount > 0 && (
          <p className="text-xs text-gray-400">{mutualCount} mutual friend{mutualCount !== 1 ? "s" : ""}</p>
        )}
      </div>
      {!isSelf && (
        <div>
          {friendStatus?.status === "accepted" ? (
            <button
              onClick={() => removeMutation.mutate({ friendId: user.id })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Friends
            </button>
          ) : friendStatus?.status === "pending_sent" ? (
            <span className="text-xs text-gray-500 px-3 py-1.5">Request sent</span>
          ) : friendStatus?.status === "pending_received" ? (
            <button
              onClick={() => acceptMutation.mutate({ requesterId: user.id })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors active:scale-[0.98]"
              style={{ backgroundColor: "var(--og-success)" }}
            >
              <Check className="w-4 h-4" />
              Confirm
            </button>
          ) : (
            <button
              onClick={() => requestMutation.mutate({ addresseeId: user.id })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors active:scale-[0.98]"
              style={{ backgroundColor: "var(--og-blue)" }}
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
            </button>
          )}
        </div>
      )}
    </div>
  );
}
