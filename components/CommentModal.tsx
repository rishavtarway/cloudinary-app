"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useApiError } from "@/hooks/useApiError";
import { useUser } from "@clerk/nextjs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    userId: string;
  };
}

interface CommentModalProps {
  videoId: string;
  onClose: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ videoId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const { user } = useUser();
  const { isLoading, executeWithErrorHandling } = useApiError();

  useEffect(() => {
    const fetchComments = async () => {
      const result = await executeWithErrorHandling(async () => {
        const response = await axios.get(`/api/videos/${videoId}/comments`);
        return response.data.data;
      });
      if (result) {
        setComments(result);
      }
    };
    fetchComments();
  }, [executeWithErrorHandling, videoId]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !user) return;

    const result = await executeWithErrorHandling(async () => {
        const response = await axios.post(`/api/videos/${videoId}/comments`, {
            text: newComment,
        });
        return response.data.data;
    });

    if (result) {
        const newlyCreatedComment: Comment = {
            ...result,
            user: {
                userId: user.id,
            },
        };
        setComments([newlyCreatedComment, ...comments]);
        setNewComment("");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Comments</h3>
        <div className="py-4">
          <div className="form-control">
            <textarea
              className="textarea textarea-bordered"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            ></textarea>
            <button
              className="btn btn-primary mt-2"
              onClick={handlePostComment}
              disabled={isLoading}
            >
              Post Comment
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="chat chat-start">
                <div className="chat-header">
                  {comment.user.userId}
                  <time className="text-xs opacity-50 ml-2">
                    {dayjs(comment.createdAt).fromNow()}
                  </time>
                </div>
                <div className="chat-bubble">{comment.text}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;