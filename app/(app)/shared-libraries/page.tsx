"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";
import { Library, Plus, Video } from "lucide-react";

const SharedLibraries = () => {
  const [libraries, setLibraries] = useState<any[]>([]);
  const [newLibraryName, setNewLibraryName] = useState("");
  const { error, isLoading, executeWithErrorHandling, clearError } = useApiError();

  const fetchLibraries = async () => {
    const result = await executeWithErrorHandling(async () => {
      const response = await axios.get("/api/libraries");
      return response.data.data;
    });
    if (result) {
      setLibraries(result);
    }
  };

  useEffect(() => {
    fetchLibraries();
  }, []);

  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibraryName.trim()) return;

    await executeWithErrorHandling(async () => {
        await axios.post("/api/libraries", { name: newLibraryName });
    });
    
    setNewLibraryName("");
    fetchLibraries();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shared Libraries</h1>
        <form onSubmit={handleCreateLibrary} className="flex gap-2">
            <input
                type="text"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
                className="input input-bordered"
                placeholder="New library name"
            />
            <button type="submit" className="btn btn-primary">
                <Plus size={16} /> Create
            </button>
        </form>
      </div>
      
      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{getErrorMessage(error)}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {libraries.map((library) => (
          <div key={library.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">
                <Library size={20} />
                {library.name}
              </h2>
              <p>{library.videos.length} videos</p>
              <div className="card-actions justify-end">
                <div className="badge badge-outline">Owner: {library.owner.userId.substring(0, 8)}...</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedLibraries;