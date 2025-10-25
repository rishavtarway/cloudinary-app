// app/(app)/workspaces/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Library, Plus, Users, Video, Trash2, ArrowLeft, Settings, Share2, Copy, CheckCircle, MessageCircle } from "lucide-react";
import { CldImage } from "next-cloudinary";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { WorkspaceRole } from "@prisma/client";

dayjs.extend(relativeTime);

// Define TypeScript interfaces matching API responses
interface MemberInfo { 
  userId: string; 
  role: WorkspaceRole; 
}

interface VideoInfo { 
  id: string; 
  title: string; 
  publicId: string; 
  createdAt: string; 
  duration: number; 
}

interface WorkspaceDetail {
  id: string;
  name: string;
  owner: { userId: string };
  userRole: WorkspaceRole;
  members: MemberInfo[];
  videos: VideoInfo[];
  createdAt: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  owner: { userId: string };
  userRole: WorkspaceRole;
  videoCount: number;
  memberCount: number;
  createdAt: string;
}

// ==============
// MODALS
// ==============

// Comment Modal Component
const CommentModal = ({ videoId, onClose }: { videoId: string; onClose: () => void; }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const { executeWithErrorHandling, isLoading } = useApiError();

  const fetchComments = useCallback(async () => {
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get(`/api/videos/${videoId}/comments`);
      return response.data.data;
    });
    if (result) {
      setComments(result);
    }
  }, [videoId, executeWithErrorHandling]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.post(`/api/videos/${videoId}/comments`, { text: newComment });
      return response.data.data;
    });
    
    if (result) {
      setNewComment("");
      fetchComments();
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Comments</h3>
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        
        <div className="max-h-60 overflow-y-auto mb-4">
          {comments.length > 0 ? (
            <ul className="space-y-2">
              {comments.map((comment) => (
                <li key={comment.id} className="p-2 bg-base-200 rounded">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-base-content/60 mt-1">
                    {comment.userId} • {dayjs(comment.createdAt).fromNow()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-base-content/70">No comments yet</p>
          )}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="input input-bordered flex-grow"
            placeholder="Add a comment..."
            required
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? "Posting..." : "Post"}
          </button>
        </form>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const ManageWorkspaceModal = ({ 
  workspace, 
  onClose, 
  onActionComplete 
}: { 
  workspace: WorkspaceDetail; 
  onClose: () => void; 
  onActionComplete: (updatedWorkspace?: WorkspaceDetail) => void; 
}) => {
  const [memberEmail, setMemberEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('VIEWER');
  const { user: currentUser } = useUser();
  const { executeWithErrorHandling: executeAdd, isLoading: isAdding, error: addError, clearError: clearAddError } = useApiError();
  const { executeWithErrorHandling: executeDelete, isLoading: isDeleting, error: deleteError } = useApiError();
  const { executeWithErrorHandling: executeRemoveMember, isLoading: isRemovingMember } = useApiError();
  const { executeWithErrorHandling: executeUpdateRole, isLoading: isUpdatingRole } = useApiError();

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAddError();
    const result = await executeAdd(async () => {
      const response = await axios.post(`/api/workspaces/${workspace.id}/members`, { 
        email: memberEmail, 
        role: selectedRole 
      });
      return response.data.data;
    });
    if (result) {
      setMemberEmail("");
      setSelectedRole('VIEWER');
      onActionComplete();
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id || targetUserId === workspace.owner.userId) return;
    if (window.confirm(`Are you sure you want to remove user ${targetUserId}?`)) {
      const result = await executeRemoveMember(async () => {
        await axios.delete(`/api/workspaces/${workspace.id}/members/${targetUserId}`);
        return true;
      });
      if (result) {
        onActionComplete();
      }
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: WorkspaceRole) => {
    if (!currentUser || targetUserId === currentUser.id || targetUserId === workspace.owner.userId || newRole === 'OWNER') return;
    const result = await executeUpdateRole(async () => {
      await axios.patch(`/api/workspaces/${workspace.id}/members/${targetUserId}`, { role: newRole });
      return true;
    });
    if (result) {
      onActionComplete();
    }
  };

  const handleDeleteWorkspace = async () => {
    if (window.confirm("Are you sure you want to delete this workspace and all its associations? This cannot be undone.")) {
      const result = await executeDelete(async () => {
        await axios.delete(`/api/workspaces/${workspace.id}`);
        return true;
      });
      if (result) {
        onActionComplete();
        onClose();
      }
    }
  };

  const canManageRole = (targetMember: MemberInfo) => {
    if (!currentUser) return false;
    if (workspace.userRole === 'OWNER' && targetMember.userId !== currentUser.id && targetMember.role !== 'OWNER') {
      return true;
    }
    return false;
  };

  const canRemoveMember = (targetMember: MemberInfo) => {
    if (!currentUser) return false;
    if (workspace.userRole === 'OWNER' && targetMember.userId !== currentUser.id && targetMember.role !== 'OWNER') {
      return true;
    }
    if (workspace.userRole === 'EDITOR' && targetMember.role === 'VIEWER') {
      return true;
    }
    return false;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Manage Workspace: {workspace.name}</h3>
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>

        {/* Member List */}
        <div className="mb-6 max-h-60 overflow-y-auto">
          <h4 className="font-semibold mb-2">Members ({workspace.members.length})</h4>
          <ul className="space-y-2">
            {/* Display owner first */}
            <li className="flex justify-between items-center p-2 bg-base-200 rounded">
              <span>{workspace.owner.userId}</span>
              <span className="badge badge-primary">Owner</span>
            </li>
            {/* Display other members */}
            {workspace.members.filter(m => m.userId !== workspace.owner.userId).map(member => (
              <li key={member.userId} className="flex justify-between items-center p-2 hover:bg-base-200 rounded group">
                <span>{member.userId} {member.userId === currentUser?.id ? '(You)' : ''}</span>
                <div className="flex items-center gap-2">
                  {canManageRole(member) ? (
                    <select
                      className="select select-bordered select-xs"
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.userId, e.target.value as WorkspaceRole)}
                      disabled={isUpdatingRole}
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="badge badge-ghost">{member.role}</span>
                  )}
                  {canRemoveMember(member) && (
                    <button 
                      className="btn btn-xs btn-ghost text-error opacity-0 group-hover:opacity-100" 
                      onClick={() => handleRemoveMember(member.userId)} 
                      disabled={isRemovingMember || isUpdatingRole}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Add Member Form (Only Owner/Editor) */}
        {(workspace.userRole === 'OWNER' || workspace.userRole === 'EDITOR') && (
          <form onSubmit={handleAddMember} className="mb-6 pt-4 border-t border-base-300">
            <h4 className="font-semibold mb-2">Invite New Member</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                value={memberEmail} 
                onChange={(e) => setMemberEmail(e.target.value)} 
                className="input input-bordered flex-grow" 
                placeholder="Enter member's email" 
                required 
              />
              <select 
                className="select select-bordered" 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)} 
                disabled={workspace.userRole === 'EDITOR'}
              >
                {workspace.userRole === 'OWNER' && <option value="EDITOR">Editor</option>}
                <option value="VIEWER">Viewer</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={isAdding}>
                {isAdding ? "Inviting..." : "Invite"}
              </button>
            </div>
            {addError && <p className="text-red-500 text-sm mt-2">{getErrorMessage(addError)}</p>}
          </form>
        )}

        {/* Delete Workspace (Owner Only) */}
        {workspace.userRole === 'OWNER' && (
          <div className="pt-4 border-t border-base-300">
            <h4 className="font-semibold text-error mb-2">Danger Zone</h4>
            <button className="btn btn-error btn-outline" onClick={handleDeleteWorkspace} disabled={isDeleting}>
              <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete Workspace"}
            </button>
            {deleteError && <p className="text-red-500 text-sm mt-2">{getErrorMessage(deleteError)}</p>}
          </div>
        )}

        {/* Modal Actions for closing */}
        <div className="modal-action mt-6">
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Share Modal (Generic for Video or Workspace)
const ShareModal = ({ 
  resourceId, 
  resourceType, 
  resourceName, 
  onClose 
}: { 
  resourceId: string; 
  resourceType: 'video' | 'workspace'; 
  resourceName: string; 
  onClose: () => void; 
}) => {
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const { executeWithErrorHandling, isLoading, error, clearError } = useApiError();

  const handleCreateLink = async () => {
    clearError();
    setShareLink(null);
    setLinkCopied(false);
    const result = await executeWithErrorHandling(async () => {
      const payload: { resourceId: string; resourceType: string; expiresAt?: string; password?: string } = { 
        resourceId, 
        resourceType 
      };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      if (password) payload.password = password;
      const response = await axios.post('/api/share-links', payload);
      return response.data.data;
    });
    if (result && result.token) {
      const shareUrl = `${window.location.origin}/share/${result.token}`;
      setShareLink(shareUrl);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  const getEmbedCode = () => {
    if (resourceType !== 'video' || !shareLink) return null;
    const publicUrl = `${window.location.origin}/embed/${resourceId}`;
    return `<iframe src="${publicUrl}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  };
  
  const embedCode = getEmbedCode();

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Share: {resourceName}</h3>
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>

        <div className="py-4 space-y-4">
          <div>
            <label className="label"><span className="label-text">Set Expiry Date (Optional)</span></label>
            <input 
              type="datetime-local" 
              className="input input-bordered w-full" 
              value={expiresAt} 
              onChange={e => setExpiresAt(e.target.value)} 
            />
          </div>
          <div>
            <label className="label"><span className="label-text">Set Password (Optional)</span></label>
            <input 
              type="password" 
              placeholder="Leave blank for no password" 
              className="input input-bordered w-full" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <button className="btn btn-primary w-full" onClick={handleCreateLink} disabled={isLoading}>
            {isLoading ? 'Generating Link...' : 'Generate Share Link'}
          </button>

          {error && <p className="text-error text-sm mt-2">{getErrorMessage(error)}</p>}

          {shareLink && (
            <div className="mt-4 p-4 bg-base-200 rounded space-y-2">
              <label className="label"><span className="label-text font-semibold">Shareable Link:</span></label>
              <div className="flex gap-2">
                <input type="text" readOnly className="input input-bordered w-full" value={shareLink} />
                <button className={`btn ${linkCopied ? 'btn-success' : ''}`} onClick={copyLink}>
                  {linkCopied ? <CheckCircle size={16}/> : <Copy size={16}/>}
                </button>
              </div>
            </div>
          )}

          {embedCode && (
            <div className="mt-4 p-4 bg-base-200 rounded space-y-2">
              <label className="label"><span className="label-text font-semibold">Embed Code (Video):</span></label>
              <textarea 
                readOnly 
                className="textarea textarea-bordered w-full font-mono text-xs" 
                rows={4} 
                value={embedCode}
              ></textarea>
              <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(embedCode)}>
                Copy Embed Code
              </button>
            </div>
          )}
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ========================
// WORKSPACE DETAIL VIEW
// ========================

const WorkspaceDetailView = ({ 
  workspaceId, 
  onBack 
}: { 
  workspaceId: string; 
  onBack: () => void; 
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();
  const [showManageModal, setShowManageModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedVideoIdForComment, setSelectedVideoIdForComment] = useState<string | null>(null);
  const [showVideoShareModal, setShowVideoShareModal] = useState(false);
  const [selectedVideoForShare, setSelectedVideoForShare] = useState<VideoInfo | null>(null);

  const fetchWorkspaceDetails = useCallback(async () => {
    clearError();
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get(`/api/workspaces/${workspaceId}`);
      return response.data.data;
    });
    if (result) {
      setWorkspace(result);
    } else {
      onBack();
    }
  }, [executeWithErrorHandling, workspaceId, clearError, onBack]);

  useEffect(() => {
    fetchWorkspaceDetails();
  }, [fetchWorkspaceDetails]);

  const handleActionComplete = (updatedWorkspace?: WorkspaceDetail) => {
    if (updatedWorkspace) {
      setWorkspace(updatedWorkspace);
    } else {
      fetchWorkspaceDetails();
    }
  };

  const handleComment = (videoId: string) => {
    setSelectedVideoIdForComment(videoId);
    setShowCommentModal(true);
  };

  const handleShareVideo = (video: VideoInfo) => {
    setSelectedVideoForShare(video);
    setShowVideoShareModal(true);
  };

  const canEdit = workspace?.userRole === 'OWNER' || workspace?.userRole === 'EDITOR';

  if (isLoading && !workspace) {
    return (
      <div className="text-center py-10">
        <span className="loading loading-spinner loading-lg"></span> Loading Workspace...
      </div>
    );
  }
  
  if (error && !workspace) {
    return (
      <div className="alert alert-error">
        Failed to load workspace: {getErrorMessage(error)} 
        <button onClick={onBack} className="btn btn-sm">Go Back</button>
      </div>
    );
  }
  
  if (!workspace) {
    return <div className="text-center py-10">Workspace not found or access denied.</div>;
  }

  return (
    <div>
      {showManageModal && (
        <ManageWorkspaceModal 
          workspace={workspace} 
          onClose={() => setShowManageModal(false)} 
          onActionComplete={handleActionComplete} 
        />
      )}
      {showShareModal && (
        <ShareModal 
          resourceId={workspace.id} 
          resourceType="workspace" 
          resourceName={workspace.name} 
          onClose={() => setShareShareModal(false)} 
        />
      )}
      {showCommentModal && selectedVideoIdForComment && (
        <CommentModal 
          videoId={selectedVideoIdForComment} 
          onClose={() => setShowCommentModal(false)} 
        />
      )}
      {showVideoShareModal && selectedVideoForShare && (
        <ShareModal 
          resourceId={selectedVideoForShare.id} 
          resourceType="video" 
          resourceName={selectedVideoForShare.title} 
          onClose={() => setShowVideoShareModal(false)} 
        />
      )}

      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <button onClick={onBack} className="btn btn-ghost">
          <ArrowLeft size={20} className="mr-2" /> Back to Workspaces
        </button>
        <div className="flex gap-2">
          {(workspace.userRole === 'OWNER' || workspace.userRole === 'EDITOR') && (
            <button className="btn btn-outline" onClick={() => setShowShareModal(true)}>
              <Share2 size={16} /> Share Workspace
            </button>
          )}
          {(workspace.userRole === 'OWNER' || workspace.userRole === 'EDITOR') && (
            <button className="btn btn-primary" onClick={() => setShowManageModal(true)}>
              <Settings size={16} /> Manage
            </button>
          )}
          {workspace.userRole === 'VIEWER' && (
            <span className="badge badge-lg badge-info self-center">Role: Viewer</span>
          )}
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-1">{workspace.name}</h1>
      <p className="text-base-content/70 mb-2">Owned by {workspace.owner.userId}</p>
      <p className="text-sm text-base-content/60 mb-6">
        Created: {dayjs(workspace.createdAt).format('MMMM D, YYYY')}
      </p>

      <h2 className="text-2xl font-semibold mb-4">Videos ({workspace.videos.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {workspace.videos.map(video => (
          <div key={video.id} className="card bg-base-100 shadow-xl group relative">
            <figure className="aspect-video bg-base-300">
              <CldImage 
                src={video.publicId} 
                width={400} 
                height={225} 
                crop="fill" 
                gravity="auto" 
                alt={video.title} 
                assetType="video" 
              />
            </figure>
            <div className="card-body p-3 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <h2 className="card-title text-sm text-white truncate drop-shadow">{video.title}</h2>
              <div className="text-xs text-gray-200">{formatDuration(video.duration)}</div>
              <div className="card-actions justify-end mt-1">
                <button 
                  className="btn btn-xs btn-ghost text-white" 
                  title="Comments" 
                  onClick={(e) => { e.stopPropagation(); handleComment(video.id); }}
                >
                  <MessageCircle size={14} />
                </button>
                {canEdit && (
                  <button 
                    className="btn btn-xs btn-ghost text-white" 
                    title="Share Video" 
                    onClick={(e) => { e.stopPropagation(); handleShareVideo(video); }}
                  >
                    <Share2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent group-hover:opacity-0 transition-opacity">
              <h2 className="text-sm text-white truncate drop-shadow">{video.title}</h2>
            </div>
          </div>
        ))}
        {workspace.videos.length === 0 && (
          <p className="col-span-full text-center py-10 text-base-content/70">
            This workspace has no videos yet.
          </p>
        )}
      </div>
    </div>
  );
};

// ====================
// MAIN PAGE COMPONENT
// ====================

const WorkspacesPage = () => {
  const { user } = useUser();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();

  const fetchWorkspaces = useCallback(async () => {
    clearError();
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get("/api/workspaces");
      return response.data.data;
    });
    if (result) {
      setWorkspaces(result);
    }
  }, [executeWithErrorHandling, clearError]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      fetchWorkspaces();
    }
  }, [selectedWorkspaceId, fetchWorkspaces]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    clearError();
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.post("/api/workspaces", { name: newWorkspaceName.trim() });
      return response.data.data;
    });
    if (result) {
      setNewWorkspaceName("");
      setWorkspaces(prev => [result, ...prev]);
    }
  };

  // Render detail view if a workspace is selected
  if (selectedWorkspaceId) {
    return (
      <WorkspaceDetailView 
        workspaceId={selectedWorkspaceId} 
        onBack={() => {
          setSelectedWorkspaceId(null);
          fetchWorkspaces(); // Refresh list when going back
        }} 
      />
    );
  }

  // Render list view
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Workspaces</h1>
        <form onSubmit={handleCreateWorkspace} className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            value={newWorkspaceName} 
            onChange={(e) => setNewWorkspaceName(e.target.value)} 
            className="input input-bordered w-full" 
            placeholder="New workspace name..." 
            required 
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Plus size={16} /> Create
          </button>
        </form>
      </div>

      {isLoading && workspaces.length === 0 && (
        <div className="text-center py-10">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="alert alert-error">
          {getErrorMessage(error)}
          <button onClick={fetchWorkspaces} className="btn btn-sm btn-ghost">Retry</button>
        </div>
      )}

      {!isLoading && workspaces.length === 0 && !error && (
        <div className="text-center py-16 bg-base-200 rounded-lg">
          <Library className="mx-auto w-16 h-16 text-base-content/50 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Workspaces Found</h2>
          <p className="text-lg text-base-content/70">Create your first workspace to collaborate.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <div 
            key={workspace.id} 
            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" 
            onClick={() => setSelectedWorkspaceId(workspace.id)}
          >
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h2 className="card-title flex items-center gap-2">
                  <Library size={20} />{workspace.name}
                </h2>
                {workspace.userRole && (
                  <div className={`badge ${workspace.userRole === 'OWNER' ? 'badge-primary' : workspace.userRole === 'EDITOR' ? 'badge-secondary' : 'badge-ghost'} badge-outline`}>
                    {workspace.userRole}
                  </div>
                )}
              </div>
              <p className="text-xs text-base-content/60 mt-1">Owner: {workspace.owner.userId}</p>
              <div className="flex justify-between items-center mt-4 text-sm text-base-content/70">
                <span className="flex items-center gap-2">
                  <Video size={16} />{workspace.videoCount} videos
                </span>
                <span className="flex items-center gap-2">
                  <Users size={16} />{workspace.memberCount} members
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkspacesPage;

// Helper function for formatting duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}