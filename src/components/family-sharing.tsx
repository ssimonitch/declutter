"use client";

import { useState, useEffect } from "react";
import {
  getUserRealms,
  getPendingInvitations,
  createRealm,
  inviteMember,
  acceptInvitation,
  removeMember,
} from "@/lib/db";
import {
  RealmSummary,
  DeclutterMember,
  CreateRealmRequest,
  InviteMemberRequest,
} from "@/lib/types";
import { useRealm } from "@/contexts/realm-context";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";

interface FamilySharingProps {
  onRealmChange?: (realmId: string | null) => void;
  className?: string;
}

export default function FamilySharing({
  onRealmChange,
  className,
}: FamilySharingProps) {
  const {
    currentRealmId,
    setCurrentRealmId,
    isLoading: contextLoading,
  } = useRealm();
  const [realms, setRealms] = useState<RealmSummary[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    DeclutterMember[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create realm form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRealmName, setNewRealmName] = useState("");
  const [newRealmDescription, setNewRealmDescription] = useState("");

  // Invite member form state
  const [showInviteForm, setShowInviteForm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  useEffect(() => {
    // Only load data once the context is ready (not loading)
    if (!contextLoading) {
      loadData();
    }
  }, [contextLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userRealms, invitations] = await Promise.all([
        getUserRealms(),
        getPendingInvitations(),
      ]);
      setRealms(userRealms);
      setPendingInvitations(invitations);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load sharing data",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRealmSwitch = (realmId: string | null) => {
    setCurrentRealmId(realmId);
    onRealmChange?.(realmId);
  };

  const handleCreateRealm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRealmName.trim()) return;

    try {
      const request: CreateRealmRequest = {
        name: newRealmName.trim(),
        description: newRealmDescription.trim() || undefined,
      };

      await createRealm(request);
      setNewRealmName("");
      setNewRealmDescription("");
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create realm");
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !showInviteForm) return;

    try {
      const request: InviteMemberRequest = {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        realmId: showInviteForm,
      };

      await inviteMember(request);
      setInviteEmail("");
      setInviteName("");
      setShowInviteForm(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    }
  };

  const handleAcceptInvitation = async (memberId: string) => {
    try {
      await acceptInvitation(memberId);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">ファミリー共有を読み込み中...</div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 sm:p-6 space-y-4 sm:space-y-6 ${className || ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          ファミリー共有
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 touch-manipulation"
        >
          家族グループ作成
        </button>
      </div>

      {error && (
        <Alert
          variant="error"
          description={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Realm Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          現在の表示
        </label>
        <select
          value={currentRealmId || "private"}
          onChange={(e) =>
            handleRealmSwitch(
              e.target.value === "private" ? null : e.target.value,
            )
          }
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="private">個人のアイテム</option>
          {realms.map((summary, index) => (
            <option
              key={`${summary.realm.realmId}-${index}`}
              value={summary.realm.realmId}
            >
              {summary.realm.name} ({summary.itemCount} items)
            </option>
          ))}
        </select>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            保留中の招待
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    家族グループへの招待
                  </div>
                  <div className="text-sm text-gray-600">
                    招待日：
                    {invitation.invited
                      ? invitation.invited.toLocaleDateString("ja-JP")
                      : "最近"}
                  </div>
                </div>
                <button
                  onClick={() =>
                    invitation.id && handleAcceptInvitation(invitation.id)
                  }
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  承認
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Realm Summary */}
      {currentRealmId && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            家族グループ
          </h3>
          <div className="space-y-4">
            {realms
              .filter(
                (summary, index, self) =>
                  self.findIndex(
                    (s) => s.realm.realmId === summary.realm.realmId,
                  ) === index,
              )
              .map((summary) => (
                <div
                  key={summary.realm.realmId}
                  className="border border-gray-200 rounded-md p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-gray-900">
                        {summary.realm.name}
                      </h4>
                      {summary.realm.description && (
                        <p className="text-sm text-gray-600">
                          {summary.realm.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        {summary.itemCount} 件のアイテム •{" "}
                        {summary.members.length} 人のメンバー
                        {summary.isOwner && " • あなたがオーナーです"}
                      </p>
                    </div>
                    {summary.isOwner && (
                      <button
                        onClick={() => setShowInviteForm(summary.realm.realmId)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 touch-manipulation flex-shrink-0"
                      >
                        招待
                      </button>
                    )}
                  </div>

                  {/* Members List */}
                  <div className="space-y-2">
                    {summary.members
                      .filter((member) => member.name || member.email)
                      .map((member, memberIndex) => (
                        <div
                          key={`${member.id || memberIndex}-${member.email || memberIndex}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-gray-600">
                                {member.name || "不明"}
                              </span>
                              {member.roles?.includes("owner") && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                  オーナー
                                </span>
                              )}
                            </div>
                            {member.email && (
                              <div className="text-sm text-gray-600 truncate max-w-full">
                                {member.email}
                              </div>
                            )}
                          </div>
                          {summary.isOwner &&
                            !member.roles?.includes("owner") && (
                              <button
                                onClick={() =>
                                  member.id && handleRemoveMember(member.id)
                                }
                                className="text-red-600 text-sm hover:text-red-800 ml-2 flex-shrink-0"
                              >
                                削除
                              </button>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Realm Form */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="家族グループ作成"
        size="md"
      >
        <form onSubmit={handleCreateRealm} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              グループ名 *
            </label>
            <input
              type="text"
              value={newRealmName}
              onChange={(e) => setNewRealmName(e.target.value)}
              placeholder="例：田中家"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <input
              type="text"
              value={newRealmDescription}
              onChange={(e) => setNewRealmDescription(e.target.value)}
              placeholder="家族の片付けプロジェクト"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 touch-manipulation"
            >
              キャンセル
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Member Form */}
      <Modal
        isOpen={!!showInviteForm}
        onClose={() => setShowInviteForm(null)}
        title="家族メンバーを招待"
        size="md"
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 *
            </label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="姉 由紀"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス *
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="yuki@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 touch-manipulation"
            >
              招待を送信
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(null)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 touch-manipulation"
            >
              キャンセル
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
