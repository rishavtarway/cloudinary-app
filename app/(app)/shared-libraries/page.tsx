// app/(app)/shared-libraries/page.tsx

"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Library, Plus, Users, Video, Trash2, ArrowLeft } from "lucide-react";
import { CldImage } from "next-cloudinary";

// Define TypeScript interfaces for our data
interface Owner { userId: string; }
interface Member { id: string; userId: string; }
interface Video { id: string; title: string; publicId: string; }
interface Library {
  id: string;
  name: string;
  owner: Owner;
  members: Member[];
  videos: Video[];
}

// ==============
// MODALS
// ==============

const ManageLibraryModal = ({ library, onClose, onActionComplete }: { library: Library; onClose: () => void; onActionComplete: () => void; }) => {
    const [memberEmail, setMemberEmail] = useState("");
    const { executeWithErrorHandling: executeAdd, isLoading: isAdding, error: addError } = useApiError();
    const { executeWithErrorHandling: executeDelete, isLoading: isDeleting, error: deleteError } = useApiError();
    const { executeWithErrorHandling: executeRemoveMember, isLoading: isRemovingMember } = useApiError();

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await executeAdd(async () => {
            return axios.post(`/api/libraries/${library.id}/members`, { email: memberEmail });
        });
        if (result) {
            setMemberEmail("");
            onActionComplete();
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (window.confirm("Are you sure you want to remove this member?")) {
            await executeRemoveMember(async () => {
                return axios.delete(`/api/libraries/${library.id}/members/${memberId}`);
            });
            onActionComplete();
        }
    };

    const handleDeleteLibrary = async () => {
        if (window.confirm("Are you sure you want to delete this library? This cannot be undone.")) {
            const result = await executeDelete(async () => {
                return axios.delete(`/api/libraries/${library.id}`);
            });
            if (result) {
                onActionComplete();
                onClose(); // Close modal on successful deletion
            }
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Manage: {library.name}</h3>

                {/* Member List */}
                <div className="mt-4">
                    <h4 className="font-semibold">Current Members</h4>
                    <ul className="mt-2 space-y-2">
                        <li className="flex justify-between items-center">{library.owner.userId} <span className="badge badge-neutral">Owner</span></li>
                        {library.members.map(member => (
                            <li key={member.id} className="flex justify-between items-center">
                                {member.userId}
                                <button className="btn btn-xs btn-ghost" onClick={() => handleRemoveMember(member.userId)} disabled={isRemovingMember}><Trash2 size={14} /></button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Add Member Form */}
                <form onSubmit={handleAddMember} className="mt-6">
                    <h4 className="font-semibold">Add New Member</h4>
                    <div className="form-control mt-2">
                        <input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="input input-bordered" placeholder="Enter member's email" />
                    </div>
                    {addError && <p className="text-red-500 text-sm mt-2">{getErrorMessage(addError)}</p>}
                    <div className="modal-action justify-between mt-6">
                        <button type="button" className="btn btn-error btn-outline" onClick={handleDeleteLibrary} disabled={isDeleting}><Trash2 size={16} />{isDeleting ? "Deleting..." : "Delete Library"}</button>
                        <div>
                            <button type="button" className="btn mr-2" onClick={onClose}>Close</button>
                            <button type="submit" className="btn btn-primary" disabled={isAdding}>{isAdding ? "Adding..." : "Add"}</button>
                        </div>
                    </div>
                    {deleteError && <p className="text-red-500 text-sm mt-2">{getErrorMessage(deleteError)}</p>}
                </form>
            </div>
        </div>
    );
};

// ========================
// LIBRARY DETAIL VIEW
// ========================

const LibraryDetailView = ({ library, onBack, onActionComplete }: { library: Library; onBack: () => void; onActionComplete: () => void; }) => {
    const { user } = useUser();
    const isOwner = user?.id === library.owner.userId;
    const { executeWithErrorHandling, isLoading } = useApiError();
    const [showManageModal, setShowManageModal] = useState(false);


    const handleRemoveVideo = async (videoId: string) => {
        if (window.confirm("Are you sure you want to remove this video from the library?")) {
            await executeWithErrorHandling(async () => {
                await axios.delete(`/api/libraries/${library.id}/videos/${videoId}`);
            });
            onActionComplete();
        }
    };

    return (
        <div>
            {showManageModal && isOwner && <ManageLibraryModal library={library} onClose={() => setShowManageModal(false)} onActionComplete={() => { onActionComplete(); setShowManageModal(false); }} />}
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="btn btn-ghost"><ArrowLeft size={20} className="mr-2" /> Back to Libraries</button>
                {isOwner && <button className="btn btn-primary" onClick={() => setShowManageModal(true)}>Manage Members & Settings</button>}
            </div>
            <h1 className="text-3xl font-bold mb-2">{library.name}</h1>
            <p className="text-base-content/70 mb-6">Owned by {library.owner.userId}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {library.videos.map(video => (
                    <div key={video.id} className="card bg-base-100 shadow-xl group">
                        <figure><CldImage src={video.publicId} width={400} height={225} crop="fill" gravity="auto" alt={video.title} assetType="video" /></figure>
                        <div className="card-body p-4">
                            <h2 className="card-title text-sm truncate">{video.title}</h2>
                            {isOwner && (
                                <div className="card-actions justify-end">
                                    <button className="btn btn-xs btn-error btn-outline opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveVideo(video.id)} disabled={isLoading}>
                                        <Trash2 size={14} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {library.videos.length === 0 && <p className="col-span-full text-center py-10">This library has no videos yet.</p>}
            </div>
        </div>
    );
};


// ====================
// MAIN PAGE COMPONENT
// ====================

const SharedLibrariesPage = () => {
    const { user } = useUser();
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [newLibraryName, setNewLibraryName] = useState("");
    const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
    const { error, isLoading, executeWithErrorHandling } = useApiError();

    const fetchLibraries = useCallback(async () => {
        const result = await executeWithErrorHandling(async () => {
            const response = await axios.get("/api/libraries");
            return response.data.data;
        });
        if (result) {
            setLibraries(result);
            // If a library was selected, update its data
            if (selectedLibrary) {
                const updatedLibrary = result.find((lib: Library) => lib.id === selectedLibrary.id);
                setSelectedLibrary(updatedLibrary || null);
            }
        }
    }, [executeWithErrorHandling, selectedLibrary]);

    useEffect(() => {
        fetchLibraries();
    }, [fetchLibraries]);

    const handleCreateLibrary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLibraryName.trim()) return;
        const result = await executeWithErrorHandling(async () => {
            return axios.post("/api/libraries", { name: newLibraryName });
        });
        if (result) {
            setNewLibraryName("");
            fetchLibraries();
        }
    };

    if (selectedLibrary) {
        return <LibraryDetailView library={selectedLibrary} onBack={() => setSelectedLibrary(null)} onActionComplete={fetchLibraries} />;
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Shared Libraries</h1>
                <form onSubmit={handleCreateLibrary} className="flex gap-2 w-full md:w-auto">
                    <input type="text" value={newLibraryName} onChange={(e) => setNewLibraryName(e.target.value)} className="input input-bordered w-full" placeholder="New library name..." />
                    <button type="submit" className="btn btn-primary" disabled={isLoading}><Plus size={16} /> Create</button>
                </form>
            </div>

            {isLoading && libraries.length === 0 && <div className="text-center py-10"><span className="loading loading-spinner loading-lg"></span></div>}
            {error && <div className="alert alert-error">{getErrorMessage(error)}</div>}
            
            {!isLoading && libraries.length === 0 && (
                <div className="text-center py-16 bg-base-200 rounded-lg">
                    <Library className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">No Libraries Found</h2>
                    <p className="text-lg text-gray-500">Create your first library to start sharing.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {libraries.map((library) => (
                    <div key={library.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => setSelectedLibrary(library)}>
                        <div className="card-body">
                            <h2 className="card-title flex items-center gap-2"><Library size={20} />{library.name}</h2>
                            <div className="flex justify-between items-center mt-4 text-sm text-base-content/70">
                                <span className="flex items-center gap-2"><Video size={16} />{library.videos.length} videos</span>
                                <span className="flex items-center gap-2"><Users size={16} />{library.members.length + 1} members</span>
                            </div>
                            <div className="card-actions justify-end mt-2">
                                {user?.id === library.owner.userId ? 
                                    <div className="badge badge-primary badge-outline">Owner</div> :
                                    <div className="badge badge-secondary badge-outline">Member</div>
                                }
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SharedLibrariesPage;