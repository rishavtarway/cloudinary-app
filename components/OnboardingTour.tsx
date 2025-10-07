"use client";
import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

const steps = [
  {
    target: '#video-library-heading',
    content: 'Welcome to your video library! All your uploaded videos will appear here.',
    position: 'bottom',
  },
  {
    target: '#upload-button', // Make sure you have an element with this ID
    content: 'Click here to upload new videos.',
    position: 'bottom',
  },
    {
    target: '#shared-libraries-link', // Make sure you have an element with this ID
    content: 'Create and manage shared libraries to collaborate with others.',
    position: 'right',
  },
  {
    target: '#media-converter-link',
    content: 'Easily convert your media to different formats and for various social media platforms.',
    position: 'right',
  },
];

const OnboardingTour = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = steps[currentStep];
  const targetElement = document.querySelector(step.target);
  
  if (!targetElement) return null;
  
  const targetRect = targetElement.getBoundingClientRect();
  
  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${targetRect.bottom + 10}px`,
    left: `${targetRect.left}px`,
    transform: 'translateX(-50%)',
    marginLeft: `${targetRect.width / 2}px`,
  };
  
  if (step.position === 'right') {
    popoverStyle.top = `${targetRect.top}px`;
    popoverStyle.left = `${targetRect.right + 10}px`;
    popoverStyle.transform = 'translateY(0)';
    popoverStyle.marginLeft = '0';
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div style={popoverStyle} className="bg-base-100 rounded-lg shadow-2xl p-4 max-w-xs w-full z-50">
        <p className="text-base-content">{step.content}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm font-semibold">{currentStep + 1} / {steps.length}</span>
          <div>
            {currentStep > 0 && <button className="btn btn-ghost btn-sm" onClick={handlePrev}><ArrowLeft size={16}/></button>}
            <button className="btn btn-primary btn-sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Finish' : <ArrowRight size={16}/>}
            </button>
          </div>
        </div>
        <button className="btn btn-ghost btn-xs btn-circle absolute top-2 right-2" onClick={onComplete}><X size={16}/></button>
      </div>
       <div className="absolute inset-0" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${targetRect.left}px ${targetRect.top}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.left}px ${targetRect.top}px)`}}></div>
    </div>
  );
};

export default OnboardingTour;