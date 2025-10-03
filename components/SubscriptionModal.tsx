"use client";
import React from "react";
import axios from "axios";

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribed: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSubscribed }) => {
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      await axios.post("/api/user", { isSubscribed: true });
      onSubscribed();
    } catch (error) {
      console.error("Failed to subscribe:", error);
      // You might want to show an error toast here
    } finally {
      setIsSubscribing(false);
      onClose();
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg">Storage Limit Exceeded!</h3>
        <p className="py-4">
          You've used up your 100 MB of free storage. To continue uploading, please upgrade your plan.
        </p>
        <div className="modal-action">
          <button className="btn btn-primary" onClick={handleSubscribe} disabled={isSubscribing}>
            {isSubscribing && <span className="loading loading-spinner"></span>}
            Subscribe Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;