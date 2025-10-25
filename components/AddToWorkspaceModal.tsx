"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useApiError, getErrorMessage } from "@/hooks/useApiError";

interface AddToLibraryModalProps {
  videoId: string;
  onClose: () => void;
}

interface Library {
  id: string;
  name: string;
}

const AddToLibraryModal: React.FC<AddToLibraryModalProps> = ({ videoId, onClose }) => {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState("");
  const { error, isLoading, executeWithErrorHandling } = useApiError();


  useEffect(() => {
    const fetchLibraries = async () => {
        const result = await executeWithErrorHandling(async () => {
            const response = await axios.get("/api/workspaces");
            return response.data.data;
        });
        if (result) {
            setLibraries(result);
            if (result.length > 0) {
                setSelectedLibrary(result[0].id);
            }
        }
    };
    fetchLibraries();
  }, [executeWithErrorHandling]);

  const handleAddToLibrary = async () => {
    if (!selectedLibrary) return;

    await executeWithErrorHandling(async () => {
        await axios.post(`/api/workspaces/${selectedLibrary}/video`, { videoId });
    });
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Add to Library</h3>
        
        {isLoading && <p>Loading libraries...</p>}
        {error && <p className="text-red-500">{getErrorMessage(error)}</p>}

        <select
          className="select select-bordered w-full mt-4"
          value={selectedLibrary}
          onChange={(e) => setSelectedLibrary(e.target.value)}
          disabled={isLoading || libraries.length === 0}
        >
          <option disabled value="">
            {libraries.length === 0 ? "No libraries found" : "Select a library"}
          </option>
          {libraries.map((library) => (
            <option key={library.id} value={library.id}>
              {library.name}
            </option>
          ))}
        </select>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleAddToLibrary}
            disabled={isLoading || !selectedLibrary}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToLibraryModal;