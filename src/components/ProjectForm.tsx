import React from 'react';
import type { Bid, User } from '../types';
import { BID_STATUSES } from '../utils/constants';
import { formatDate } from '../utils/formatters';
import FormField, { Input, Select, Textarea } from './ui/FormField';
import UserAvatar from './ui/UserAvatar';
import StatusBadge from './ui/StatusBadge';
import { Card, CardContent } from '../components/ui/card';

interface ProjectFormData {
  title: string;
  status: string;
  due_date: string;
  notes: string;
  project_name: string;
  project_address: string;
  general_contractor: string;
  project_description: string;
  estimated_value: number;
  created_by: string;
  assign_to: string;
}

interface ProjectFormProps {
  bid: Bid;
  formData: ProjectFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProjectFormData>>;
  users: User[];
  isEditing: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  bid,
  formData,
  setFormData,
  users,
  isEditing
}) => {
  const assignedUser = users.find(u => u.id === bid.assign_to);
  
  const updateFormData = (field: keyof ProjectFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'estimated_value' 
      ? parseFloat(e.target.value) || 0
      : e.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <Card>
      <CardContent>
      {/* Project Header */}
      <div className="flex items-end mb-6 gap-4">
        <div className="flex-1">
          <FormField label="Project Title">
            {isEditing ? (
              <Input
                type="text"
                value={formData.project_name}
                onChange={updateFormData('project_name')}
                placeholder="Enter project name"
              />
            ) : (
              <div className="text-xl font-semibold text-gray-900 py-2">
                {bid.project_name}
              </div>
            )}
          </FormField>
        </div>
        
        <div className="min-w-48">
          <FormField label="Status">
            {isEditing ? (
              <Select
                value={formData.status}
                onChange={updateFormData('status')}
              >
                {BID_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="py-2">
                <StatusBadge status={bid.status} variant="dropdown" />
              </div>
            )}
          </FormField>
        </div>
      </div>
      
      {/* Project Details Grid */}
      <div className="grid grid-cols-3 gap-6">
        <FormField label="Address">
          {isEditing ? (
            <Input
              type="text"
              value={formData.project_address}
              onChange={updateFormData('project_address')}
              placeholder="Enter project address"
            />
          ) : (
            <span className="text-gray-900">{bid.project_address}</span>
          )}
        </FormField>
        
        <FormField label="General Contractor">
          {isEditing ? (
            <Input
              type="text"
              value={formData.general_contractor}
              onChange={updateFormData('general_contractor')}
              placeholder="Enter general contractor"
            />
          ) : (
            <span className="text-gray-900">{bid.general_contractor}</span>
          )}
        </FormField>
        
        <FormField label="Bid Date">
          {isEditing ? (
            <Input
              type="date"
              value={formData.due_date}
              onChange={updateFormData('due_date')}
            />
          ) : (
            <span className="text-gray-900">
              {formatDate(bid.due_date)}
            </span>
          )}
        </FormField>
        
        <FormField label="Assign To">
          {isEditing ? (
            <Select
              value={formData.assign_to}
              onChange={updateFormData('assign_to')}
            >
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          ) : (
            assignedUser && <UserAvatar user={assignedUser} showName />
          )}
        </FormField>
        
        <FormField label="Estimated Value" className="col-span-2">
          {isEditing ? (
            <Input
              type="number"
              value={formData.estimated_value}
              onChange={updateFormData('estimated_value')}
              placeholder="Enter estimated value"
            />
          ) : (
            <span className="text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(bid.estimated_value || 0)}
            </span>
          )}
        </FormField>
        
        <FormField label="Project Description" className="col-span-3">
          {isEditing ? (
            <Textarea
              value={formData.project_description}
              onChange={updateFormData('project_description')}
              placeholder="Enter project description"
              rows={3}
            />
          ) : (
            <span className="text-gray-900">{bid.project_description}</span>
          )}
        </FormField>
      </div>
      </CardContent>
    </Card>
  );
};

export default ProjectForm;