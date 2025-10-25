"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { useUser } from "@clerk/nextjs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface CommentUser { userId: string; /* Add other details like name/avatar if fetched */ }
interface Comment {
  id: string;
  text: string;
  timestamp?: number | null; // Added timestamp
  createdAt: string;
  user: CommentUser;
  // mentionedUserIds?: string[]; // If mentions are stored
}

interface CommentModalProps {
  videoId: string;
  onClose: () => void;
  videoPlayerRef?: React.RefObject<HTMLVideoElement>; // Optional ref to get timestamp
}

const CommentModal: React.FC<CommentModalProps> = ({ videoId, onClose, videoPlayerRef }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);
  const { user } = useUser();
  const { isLoading, error, executeWithErrorHandling, clearError } = useApiError();
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    const fetchComments = async () => {
      clearError();
      const result = await executeWithErrorHandling(async () => {
        const response = await axios.get(`/api/videos/${videoId}/comments`);
        return response.data.data; // Assuming API returns comments array in 'data'
      });
      if (result) {
        setComments(result);
      }
    };
    fetchComments();
  }, [executeWithErrorHandling, videoId, clearError]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;
    clearError();

    const payload: { text: string; timestamp?: number | null } = {
        text: newComment.trim(),
    };
    if (commentTimestamp !== null) {
        payload.timestamp = commentTimestamp;
    }

    // Basic @mention extraction (replace with more robust logic + user fetching/validation if needed)
    // const mentions = newComment.match(/@[\w.-]+/g) || [];
    // console.log("Mentions found:", mentions);

    const result = await executeWithErrorHandling(async () => {
        const response = await axios.post(`/api/videos/${videoId}/comments`, payload);
        return response.data.data; // Assuming API returns the created comment in 'data'
    });

    if (result) {
         // API now includes user data, directly use it
        setComments([result, ...comments]);
        setNewComment("");
        setCommentTimestamp(null); // Reset timestamp after posting
    }
  };

   // Capture timestamp when focusing textarea
   const handleFocusComment = () => {
       if (videoPlayerRef?.current && !videoPlayerRef.current.paused) {
           setCommentTimestamp(Math.floor(videoPlayerRef.current.currentTime));
       } else {
           setCommentTimestamp(null); // Don't set if paused or no ref
       }
   };

    // Format timestamp like "1:23"
    const formatTimestamp = (seconds: number | null | undefined): string | null => {
        if (seconds === null || seconds === undefined || seconds < 0) return null;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Render mentions (simple example)
    const renderCommentText = (text: string) => {
         // Replace @mention patterns with styled spans or links
         // This is a basic example; consider libraries for complex mention handling
         return text.split(/(@[\w.-]+)/g).map((part, index) => {
             if (part.startsWith('@')) {
                 // You could fetch user data here or link to a profile
                 return <strong key={index} className="text-info">{part}</strong>;
             }
             return part;
         });
    }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg flex justify-between items-center">
            Comments
             <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>✕</button>
        </h3>
        <div className="py-4">
          <div className="form-control mb-4">
            <textarea
              ref={textareaRef}
              className="textarea textarea-bordered h-24"
              placeholder="Add a comment... Use @ to mention users (e.g., @user_id)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onFocus={handleFocusComment} // Capture timestamp on focus
              aria-label="New comment"
            ></textarea>
             {commentTimestamp !== null && (
                 <span className="text-xs text-info mt-1">Timestamp: {formatTimestamp(commentTimestamp)}</span>
             )}
            <button
              className="btn btn-primary mt-2"
              onClick={handlePostComment}
              disabled={isLoading || !newComment.trim()}
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : "Post Comment"}
            </button>
             {error && <p className="text-error text-sm mt-1">{getErrorMessage(error)}</p>}
          </div>

          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
             {isLoading && comments.length === 0 && <div className="text-center"><span className="loading loading-spinner"></span></div>}
             {!isLoading && comments.length === 0 && <p className="text-center text-base-content/70">No comments yet.</p>}

            {comments.map((comment) => (
              <div key={comment.id} className="chat chat-start">
                <div className="chat-header text-sm">
                  {comment.user.userId} {/* Display Clerk User ID */}
                  {comment.timestamp !== null && comment.timestamp !== undefined && (
                     <span className="text-info ml-2 cursor-pointer" title={`Go to ${formatTimestamp(comment.timestamp)}`} onClick={() => {
                        if(videoPlayerRef?.current) videoPlayerRef.current.currentTime = comment.timestamp!;
                     }}>
                        [{formatTimestamp(comment.timestamp)}]
                     </span>
                  )}
                  <time className="text-xs opacity-50 ml-2">
                    {dayjs(comment.createdAt).fromNow()}
                  </time>
                </div>
                <div className="chat-bubble break-words">
                    {renderCommentText(comment.text)}
                 </div>
              </div>
            ))}
          </div>
        </div>
        {/* Removed redundant close button from modal-action as it's in the header now */}
      </div>
    </div>
  );
};

export default CommentModal;