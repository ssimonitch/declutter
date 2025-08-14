"use client";

import { useState, useEffect, useMemo } from "react";
import { useObservable } from "dexie-react-hooks";
import type { Invite } from "dexie-cloud-addon";
import {
  getUserRealms,
  createRealm,
  inviteMember,
  removeMember,
  getDb,
} from "@/lib/db";
import {
  RealmSummary,
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

  // Use Dexie Cloud's built-in invites observable
  const db = useMemo(() => getDb(), []);
  const cloudInvites = useObservable(db.cloud?.invites);

  // Check if Dexie Cloud is disabled
  const isDexieCloudDisabled =
    process.env.NEXT_PUBLIC_DISABLE_DEXIE_CLOUD === "true";

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

  // Reload data when realm changes to ensure items are fresh
  useEffect(() => {
    if (!contextLoading && currentRealmId !== undefined) {
      loadData();
    }
  }, [currentRealmId, contextLoading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const userRealms = await getUserRealms();
      setRealms(userRealms);
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

  const handleAcceptInvitation = async (invite: Invite) => {
    try {
      // Use Dexie Cloud's built-in accept method
      await invite.accept();

      // Trigger explicit sync to ensure latest realm membership is fetched
      if (db.cloud && !isDexieCloudDisabled) {
        try {
          await db.cloud.sync();
        } catch (syncError) {
          console.warn("Failed to sync after accepting invitation:", syncError);
        }
      }

      // Reload realms data to show the newly joined realm
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    }
  };

  const handleRejectInvitation = async (invite: Invite) => {
    try {
      // Use Dexie Cloud's built-in reject method
      await invite.reject();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject invitation",
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

  // If Dexie Cloud is disabled, show a simple message
  if (isDexieCloudDisabled) {
    return (
      <div
        className={`bg-white rounded-lg shadow p-4 sm:p-6 ${className || ""}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-suzu-neutral-900">
              ファミリー共有
            </h2>
            <p className="text-sm text-suzu-neutral-700 mt-1">
              Dexie
              Cloudが無効になっているため、ファミリー共有機能は利用できません
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-suzu-neutral-100 text-suzu-neutral-700">
            ローカルモード
          </span>
        </div>
      </div>
    );
  }

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
        <h2 className="text-lg sm:text-xl font-semibold text-suzu-neutral-900">
          ファミリー共有
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-suzu-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-suzu-primary-600 touch-manipulation"
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
        <label className="block text-sm font-medium text-suzu-neutral-800 mb-2">
          現在の表示
        </label>
        <select
          value={currentRealmId || "private"}
          onChange={(e) =>
            handleRealmSwitch(
              e.target.value === "private" ? null : e.target.value,
            )
          }
          className="w-full border border-suzu-brown-300 rounded-md px-3 py-2 text-suzu-neutral-900 focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent"
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
      {cloudInvites && cloudInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-suzu-neutral-900 mb-3">
            保留中の招待
          </h3>
          <div className="space-y-2">
            {cloudInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-suzu-primary-50 border border-suzu-primary-200 rounded-md"
              >
                <div>
                  <div className="font-medium text-suzu-neutral-900">
                    {invite.realm?.name || "家族グループ"}への招待
                  </div>
                  <div className="text-sm text-suzu-neutral-700">
                    役割: {invite.roles?.join(", ") || "メンバー"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(invite)}
                    className="bg-suzu-primary-500 text-white px-3 py-1 rounded text-sm hover:bg-suzu-primary-600"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => handleRejectInvitation(invite)}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                  >
                    拒否
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Realm Summary */}
      {currentRealmId && (
        <div>
          <h3 className="text-lg font-medium text-suzu-neutral-900 mb-3">
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
                  className="border border-suzu-brown-200 rounded-md p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-suzu-neutral-900">
                        {summary.realm.name}
                      </h4>
                      {summary.realm.description && (
                        <p className="text-sm text-suzu-neutral-700">
                          {summary.realm.description}
                        </p>
                      )}
                      <p className="text-sm text-suzu-neutral-700">
                        {summary.itemCount} 件のアイテム •{" "}
                        {summary.members.length} 人のメンバー
                        {summary.isOwner && " • あなたがオーナーです"}
                      </p>
                    </div>
                    {summary.isOwner && (
                      <button
                        onClick={() => setShowInviteForm(summary.realm.realmId)}
                        className="bg-suzu-success text-white px-3 py-1 rounded text-sm hover:bg-suzu-primary-600 touch-manipulation flex-shrink-0"
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
                          className="flex items-center justify-between p-2 bg-suzu-cream rounded"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-suzu-neutral-800">
                                {member.name || "不明"}
                              </span>
                              {member.roles?.includes("owner") && (
                                <span className="bg-suzu-primary-100 text-suzu-primary-800 px-2 py-0.5 rounded text-xs">
                                  オーナー
                                </span>
                              )}
                              {!member.roles?.includes("owner") &&
                                member.permissions && (
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                    編集可
                                  </span>
                                )}
                              {!member.roles?.includes("owner") &&
                                !member.permissions && (
                                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                    読み取り専用
                                  </span>
                                )}
                            </div>
                            {member.email && (
                              <div className="text-sm text-suzu-neutral-700 truncate max-w-full">
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
                                className="text-suzu-error text-sm hover:text-red-800 ml-2 flex-shrink-0"
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
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              グループ名 *
            </label>
            <input
              type="text"
              value={newRealmName}
              onChange={(e) => setNewRealmName(e.target.value)}
              placeholder="例：田中家"
              className="w-full border border-suzu-brown-300 rounded-md px-3 py-2 text-suzu-neutral-900 placeholder-suzu-neutral-500 focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              説明
            </label>
            <input
              type="text"
              value={newRealmDescription}
              onChange={(e) => setNewRealmDescription(e.target.value)}
              placeholder="家族の片付けプロジェクト"
              className="w-full border border-suzu-brown-300 rounded-md px-3 py-2 text-suzu-neutral-900 placeholder-suzu-neutral-500 focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent touch-manipulation"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-suzu-primary-500 text-white py-2 rounded-md hover:bg-suzu-primary-600 focus:outline-none focus:ring-2 focus:ring-suzu-primary-500 touch-manipulation"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-suzu-brown-300 text-suzu-brown-700 py-2 rounded-md hover:bg-suzu-brown-400 focus:outline-none focus:ring-2 focus:ring-suzu-brown-500 touch-manipulation"
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
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              名前 *
            </label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="姉 由紀"
              className="w-full border border-suzu-brown-300 rounded-md px-3 py-2 text-suzu-neutral-900 placeholder-suzu-neutral-500 focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-suzu-neutral-800 mb-1">
              メールアドレス *
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="yuki@example.com"
              className="w-full border border-suzu-brown-300 rounded-md px-3 py-2 text-suzu-neutral-900 placeholder-suzu-neutral-500 focus:ring-2 focus:ring-suzu-primary-500 focus:border-transparent touch-manipulation"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-suzu-success text-white py-2 rounded-md hover:bg-suzu-primary-600 focus:outline-none focus:ring-2 focus:ring-suzu-success touch-manipulation"
            >
              招待を送信
            </button>
            <button
              type="button"
              onClick={() => setShowInviteForm(null)}
              className="flex-1 bg-suzu-brown-300 text-suzu-brown-700 py-2 rounded-md hover:bg-suzu-brown-400 focus:outline-none focus:ring-2 focus:ring-suzu-brown-500 touch-manipulation"
            >
              キャンセル
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
