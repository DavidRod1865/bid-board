import React, { useState } from 'react';
import type { Vendor } from '../../../../shared/types';
import VendorInformationStep from './VendorInformationStep';
import ContactManagementStep from './ContactManagementStep';
import ReviewStep from './ReviewStep';
import WizardNavigation from './WizardNavigation';

interface ContactData {
  contact_name: string;
  contact_title?: string;
  phone?: string;
  email?: string;
  contact_type: 'Office' | 'General Contractor' | 'Sales' | 'Billing';
  is_primary: boolean;
  is_emergency_contact: boolean;
  notes?: string;
}

interface VendorCreationWizardProps {
  onComplete: (vendorData: Omit<Vendor, 'id'>, contacts: ContactData[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  defaultVendorType?: 'Vendor' | 'Subcontractor' | 'General Contractor';
}

const VendorCreationWizard: React.FC<VendorCreationWizardProps> = ({
  onComplete,
  onCancel,
  isLoading = false,
  defaultVendorType = 'Vendor'
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [vendorData, setVendorData] = useState<Partial<Vendor>>({
    company_name: '',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    notes: '',
    specialty: '',
    is_priority: false,
    vendor_type: defaultVendorType,
    insurance_expiry_date: null,
    insurance_notes: '',
    primary_contact_id: null,
  });
  
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});

  // Step validation functions
  const validateStep1 = (): boolean => {
    const errors: string[] = [];
    
    if (!vendorData.company_name?.trim()) {
      errors.push('Company name is required');
    }
    if (!vendorData.address?.trim()) {
      errors.push('Address is required');
    }
    if (!vendorData.vendor_type) {
      errors.push('Vendor type is required');
    }
    
    const hasErrors = errors.length > 0;
    setStepErrors(prev => ({ ...prev, 1: hasErrors }));
    return !hasErrors;
  };

  const validateStep2 = (): boolean => {
    // Step 2 is optional - contacts can be empty
    if (contacts.length === 0) {
      setStepErrors(prev => ({ ...prev, 2: false }));
      return true;
    }

    // If contacts exist, validate them
    const errors: string[] = [];
    const primaryContacts = contacts.filter(c => c.is_primary);
    
    if (primaryContacts.length > 1) {
      errors.push('Only one primary contact is allowed');
    }
    
    contacts.forEach((contact, index) => {
      if (!contact.contact_name?.trim()) {
        errors.push(`Contact ${index + 1}: Name is required`);
      }
      if (!contact.contact_type) {
        errors.push(`Contact ${index + 1}: Type is required`);
      }
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push(`Contact ${index + 1}: Invalid email format`);
      }
    });

    const hasErrors = errors.length > 0;
    setStepErrors(prev => ({ ...prev, 2: hasErrors }));
    return !hasErrors;
  };

  // Navigation handlers
  const handleNext = () => {
    let canProceed = false;
    
    if (currentStep === 1) {
      canProceed = validateStep1();
    } else if (currentStep === 2) {
      canProceed = validateStep2();
    }
    
    if (canProceed && currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    // Allow navigation to previous steps or current step
    if (step <= currentStep || step === 1) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    if (validateStep1() && validateStep2()) {
      await onComplete(vendorData as Omit<Vendor, 'id'>, contacts);
    }
  };

  // Contact management handlers
  const handleAddContact = (contact: ContactData) => {
    setContacts(prev => [...prev, contact]);
  };

  const handleUpdateContact = (index: number, contact: ContactData) => {
    setContacts(prev => prev.map((c, i) => i === index ? contact : c));
  };

  const handleRemoveContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryContact = (index: number) => {
    setContacts(prev => prev.map((c, i) => ({
      ...c,
      is_primary: i === index
    })));
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Vendor Information';
      case 2: return 'Contact Management';
      case 3: return 'Review & Submit';
      default: return '';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <VendorInformationStep
            vendorData={vendorData}
            onVendorDataChange={setVendorData}
            errors={stepErrors[1] ? {} : {}} // We'll handle errors in the step component
          />
        );
      case 2:
        return (
          <ContactManagementStep
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onRemoveContact={handleRemoveContact}
            onSetPrimaryContact={handleSetPrimaryContact}
          />
        );
      case 3:
        return (
          <ReviewStep
            vendorData={vendorData}
            contacts={contacts}
            onEditVendor={() => setCurrentStep(1)}
            onEditContacts={() => setCurrentStep(2)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Add New Vendor
        </h2>
        <p className="text-sm text-gray-600">
          Step {currentStep} of 3: {getStepTitle()}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((step) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          const hasError = stepErrors[step];
          
          return (
            <div key={step} className="flex items-center">
              <button
                onClick={() => handleStepClick(step as 1 | 2 | 3)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-colors cursor-pointer
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                      ? hasError 
                        ? 'bg-red-500 text-white'
                        : 'bg-[#d4af37] text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }
                `}
                disabled={isLoading}
              >
                {isCompleted ? '✓' : step}
              </button>
              {step < 3 && (
                <div className={`
                  w-16 h-0.5 ml-2
                  ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <WizardNavigation
        currentStep={currentStep}
        onBack={handleBack}
        onNext={handleNext}
        onCancel={onCancel}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canProceed={currentStep === 1 ? !stepErrors[1] : currentStep === 2 ? !stepErrors[2] : true}
      />
    </div>
  );
};

export default VendorCreationWizard;
export type { ContactData };