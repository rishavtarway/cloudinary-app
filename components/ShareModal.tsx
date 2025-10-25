// components/ShareModal.tsx
"use client";
import React, { useState } from 'react';
import axios from 'axios';
import { useApiError, getErrorMessage } from '@/hooks/useApiError';
import { Share2, LinkIcon, Lock, Calendar, Copy, CheckCircle, Loader2 } from 'lucide-react';

interface ShareModalProps {
  resourceId: string;
  resourceType: 'video' | 'workspace';
  resourceName: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ resourceId, resourceType, resourceName, onClose }) => {
    const [expiresAt, setExpiresAt] = useState<string>(''); // ISO string format for datetime-local input
    const [password, setPassword] = useState<string>('');
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState<boolean>(false);
    const { executeWithErrorHandling, isLoading, error, clearError } = useApiError();

     // Get current date/time in local timezone for min attribute of datetime-local
     const getLocalDateTimeNow = () => {
         const now = new Date();
         now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Adjust for local timezone
         return now.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
     };

     const handleCreateLink = async () => {
        clearError();
        setShareLink(null);
        setLinkCopied(false);
        const result = await executeWithErrorHandling(async () => {
            const payload: { resourceId: string; resourceType: string; expiresAt?: string; password?: string } = { resourceId, resourceType };
            // Convert local datetime-local string to ISO string UTC for backend
            if (expiresAt) {
                 try {
                     // Parse as local time, then convert to ISO string (which will be UTC 'Z')
                     payload.expiresAt = new Date(expiresAt).toISOString();
                 } catch (e) {
                     console.error("Invalid date format:", expiresAt+"", e);
                     throw new Error("Invalid expiry date format."); // Let useApiError catch this
                 }
            }
            if (password.trim()) payload.password = password.trim();

            const response = await axios.post('/api/share-links', payload);
            return response.data.data; // Expecting { token: string }
        });
        if (result && result.token) {
            // Construct the full shareable URL using the current window origin
            const shareUrl = `${window.location.origin}/share/${result.token}`;
            setShareLink(shareUrl);
        }
     };

     const copyToClipboard = (textToCopy: string | null) => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2500); // Reset after 2.5s
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // Optionally show an error message to the user
            });
        }
     };

     // Generate Embed Code (Basic Example for Videos)
     const getEmbedCode = () => {
        // Base embed code on the *publicId* if available and resourceType is video
        // This avoids relying on the share link token for embedding, which is better practice.
        // You might need to fetch the publicId if `resourceName` isn't it.
        // This example assumes `resourceName` might contain info needed or you fetch it elsewhere.
        // A dedicated embed endpoint /api/embed/[videoId] returning publicId might be safer.
        if (resourceType !== 'video') return null;

        // Placeholder: Replace with actual logic to get public ID if needed
        const videoPublicId = resourceName; // Adjust if needed

        if (!videoPublicId) return null; // Can't embed without publicId

        // Basic Cloudinary Player embed code - customize as needed
         const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
         if (!cloudName) return ``;

         const videoUrl = `https://player.cloudinary.com/embed/?public_id=${encodeURIComponent(videoPublicId)}&cloud_name=${encodeURIComponent(cloudName)}&source_types%5B0%5D=mp4`;

         return `<iframe src="${videoUrl}" width="640" height="360" style="width: 100%; aspect-ratio: 16 / 9;" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen frameborder="0"></iframe>`;
     }
     const embedCode = getEmbedCode();

    return (
         <div className="modal modal-open">
             <div className="modal-box relative">
                 <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
                 <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                    <Share2 size={20} /> Share: {resourceName}
                 </h3>

                 <div className="py-1 space-y-4">
                     {/* Expiry Date */}
                     <div className="form-control">
                         <label className="label cursor-pointer justify-start gap-2" htmlFor="expiresAtInput">
                            <Calendar size={16} className="text-base-content/70" />
                            <span className="label-text">Set Expiry Date (Optional)</span>
                         </label>
                         <input
                            id="expiresAtInput"
                            type="datetime-local"
                            className="input input-bordered w-full"
                            value={expiresAt}
                            onChange={e => setExpiresAt(e.target.value)}
                            min={getLocalDateTimeNow()} // Prevent setting past dates
                            aria-label="Expiry date and time"
                         />
                     </div>

                     {/* Password */}
                     <div className="form-control">
                         <label className="label cursor-pointer justify-start gap-2" htmlFor="passwordInput">
                             <Lock size={16} className="text-base-content/70" />
                             <span className="label-text">Set Password (Optional)</span>
                         </label>
                         <input
                            id="passwordInput"
                            type="password"
                            placeholder="Leave blank for public access"
                            className="input input-bordered w-full"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            aria-label="Password for share link"
                         />
                     </div>

                     {/* Generate Button */}
                     <button className="btn btn-primary w-full mt-2" onClick={handleCreateLink} disabled={isLoading} aria-busy={isLoading}>
                        {isLoading && <Loader2 className="animate-spin mr-2" size={16} />}
                        {isLoading ? 'Generating Link...' : 'Generate Share Link'}
                     </button>

                     {/* Error Display */}
                     {error && <p className="text-error text-sm mt-2 text-center">{getErrorMessage(error)}</p>}

                     {/* Share Link Display */}
                     {shareLink && (
                        <div className="mt-4 p-3 bg-base-200 rounded space-y-1 border border-base-300">
                             <label className="label py-1"><span className="label-text font-semibold flex items-center gap-1"><LinkIcon size={14}/> Shareable Link:</span></label>
                             <div className="flex gap-2 items-center">
                                <input type="text" readOnly className="input input-bordered input-sm w-full text-xs" value={shareLink} onClick={(e) => (e.target as HTMLInputElement).select()} aria-label="Generated share link"/>
                                <button
                                    className={`btn btn-sm ${linkCopied ? 'btn-success' : 'btn-ghost'}`}
                                    onClick={() => copyToClipboard(shareLink)}
                                    title="Copy link"
                                    aria-live="polite"
                                >
                                    {linkCopied ? <CheckCircle size={16}/> : <Copy size={16}/>}
                                </button>
                             </div>
                        </div>
                     )}

                     {/* Embed Code Display (Only for Videos) */}
                     {embedCode && (
                        <div className="mt-4 p-3 bg-base-200 rounded space-y-1 border border-base-300">
                            <label className="label py-1"><span className="label-text font-semibold">Embed Code (Video):</span></label>
                             <textarea
                                readOnly
                                className="textarea textarea-bordered w-full font-mono text-xs h-24 resize-none"
                                rows={3}
                                value={embedCode}
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                aria-label="Embed code for video"
                             ></textarea>
                              <button
                                className={`btn btn-sm ${linkCopied ? 'btn-success' : 'btn-ghost'}`}
                                onClick={() => copyToClipboard(embedCode)}
                                title="Copy embed code"
                                aria-live="polite"
                              >
                                {linkCopied ? <CheckCircle size={16}/> : <Copy size={16}/>} Copy Embed
                              </button>
                        </div>
                     )}
                 </div>

                 {/* Modal Close Action */}
                 <div className="modal-action mt-6">
                     <button className="btn btn-ghost" onClick={onClose}>Close</button>
                 </div>
             </div>
         </div>
    )
}

export default ShareModal;