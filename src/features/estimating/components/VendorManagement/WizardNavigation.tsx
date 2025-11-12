import React from 'react';
import { Button } from '../../../../shared/components/ui/Button';

interface WizardNavigationProps {
  currentStep: 1 | 2 | 3;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  isLoading?: boolean;
  canProceed?: boolean;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  onBack,
  onNext,
  onCancel,
  onSubmit,
  isLoading = false,
  canProceed = true
}) => {
  return (
    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
      {/* Left side - Back button */}
      <div>
        {currentStep > 1 ? (
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </Button>
        ) : (
          <div /> // Empty div for spacing
        )}
      </div>

      {/* Right side - Cancel, Next/Submit buttons */}
      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        
        {currentStep < 3 ? (
          <Button
            variant="default"
            onClick={onNext}
            disabled={isLoading || !canProceed}
          >
            {currentStep === 2 ? 'Next' : 'Next'}
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={onSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Vendor'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WizardNavigation;