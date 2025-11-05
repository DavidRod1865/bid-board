import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { BidVendor, Vendor, Bid, User } from "../../../../shared/types";
import { getPhaseDisplayName, getCurrentPhasesWithSoonestFollowUp } from "../../../../shared/utils/phaseFollowUpUtils";

// Helper function to format dates avoiding timezone conversion issues
const formatDateSafe = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  
  // Extract just the date part from timestamps to avoid timezone conversion
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  // Create local date to avoid timezone shifts
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../shared/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../shared/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../shared/components/ui/select";
import { Input } from "../../../../shared/components/ui/input";
import { Button } from "../../../../shared/components/ui/button-shadcn";
import { Progress } from "../../../../shared/components/ui/progress";
import { Textarea } from "../../../../shared/components/ui/textarea";
import { useToast } from "../../../../shared/hooks/useToast";

// Utility function to format database timestamp to date string for HTML inputs
const formatDateForInput = (dateString: string | null): string => {
  if (!dateString) return "";
  // Convert timestamp to YYYY-MM-DD format for HTML date inputs
  return dateString.split('T')[0];
};

// Form validation schema
const formSchema = z.object({
  assigned_apm_user: z.string().nullable(),
  apm_phase: z.enum([
    "buy_number",
    "po",
    "submittals",
    "revised_plans",
    "equipment_release",
    "closeouts",
    "completed",
  ]),
  apm_status: z.enum([
    "pending",
    "requested",
    "in_progress",
    "received",
    "approved",
    "on_hold",
    "issue",
    "completed",
    "complete",
  ]),
  apm_priority: z.boolean(),
  next_follow_up_date: z.string().nullable(),

  // Quote confirmation
  cost_amount: z.string().nullable(),
  final_quote_amount: z.string().nullable(),
  final_quote_confirmed_date: z.string().nullable(),
  final_quote_notes: z.string().nullable(),

  // Buy# phase
  buy_number_requested_date: z.string().nullable(),
  buy_number_follow_up_date: z.string().nullable(),
  buy_number_received_date: z.string().nullable(),
  buy_number_notes: z.string().nullable(),

  // PO phase
  po_requested_date: z.string().nullable(),
  po_sent_date: z.string().nullable(),
  po_follow_up_date: z.string().nullable(),
  po_received_date: z.string().nullable(),
  po_confirmed_date: z.string().nullable(),
  po_notes: z.string().nullable(),

  // Submittals phase
  submittals_requested_date: z.string().nullable(),
  submittals_follow_up_date: z.string().nullable(),
  submittals_received_date: z.string().nullable(),
  submittals_approved_date: z.string().nullable(),
  submittals_rejected_date: z.string().nullable(),
  submittals_rejection_reason: z.string().nullable(),
  submittals_revision_count: z.number(),
  submittals_last_revision_date: z.string().nullable(),
  submittals_notes: z.string().nullable(),

  // Revised plans phase
  revised_plans_requested_date: z.string().nullable(),
  revised_plans_sent_date: z.string().nullable(),
  revised_plans_follow_up_date: z.string().nullable(),
  revised_plans_confirmed_date: z.string().nullable(),
  revised_plans_notes: z.string().nullable(),

  // Equipment release phase
  equipment_release_requested_date: z.string().nullable(),
  equipment_release_follow_up_date: z.string().nullable(),
  equipment_released_date: z.string().nullable(),
  equipment_release_notes: z.string().nullable(),

  // Closeouts phase
  closeout_requested_date: z.string().nullable(),
  closeout_follow_up_date: z.string().nullable(),
  closeout_received_date: z.string().nullable(),
  closeout_approved_date: z.string().nullable(),
  closeout_notes: z.string().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface APMVendorWorkflowFormProps {
  vendor: BidVendor;
  bid: Bid;
  vendorInfo: Vendor;
  users: User[];
  onUpdate: (vendorId: number, updates: Partial<BidVendor>) => Promise<void>;
  onClose: () => void;
}

const APMVendorWorkflowForm: React.FC<APMVendorWorkflowFormProps> = ({
  vendor,
  users,
  onUpdate,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("assignment");
  const { showSuccess, showError } = useToast();

  // Function to get default status for a phase
  const getStatusForPhase = (phase: string): "pending" | "requested" | "in_progress" | "received" | "approved" | "on_hold" | "issue" | "completed" | "complete" => {
    switch (phase) {
      case "buy_number":
        return "pending";
      case "po":
        return "pending";
      case "submittals":
        return "pending";
      case "revised_plans":
        return "pending";
      case "equipment_release":
        return "pending";
      case "closeouts":
        return "pending";
      case "completed":
        return "completed";
      default:
        return "pending";
    }
  };

  // Initialize form with vendor data
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assigned_apm_user: vendor.assigned_apm_user || "unassigned",
      apm_phase:
        vendor.apm_phase === "quote_confirmed"
          ? "buy_number"
          : vendor.apm_phase,
      apm_status: vendor.apm_status,
      apm_priority: vendor.apm_priority,
      next_follow_up_date: formatDateForInput(vendor.next_follow_up_date),
      cost_amount: vendor.cost_amount ? (typeof vendor.cost_amount === 'number' ? vendor.cost_amount.toString() : vendor.cost_amount) : null,
      final_quote_amount: vendor.final_quote_amount ? (typeof vendor.final_quote_amount === 'number' ? vendor.final_quote_amount.toString() : vendor.final_quote_amount) : null,
      final_quote_confirmed_date: formatDateForInput(vendor.final_quote_confirmed_date),
      final_quote_notes: vendor.final_quote_notes || null,
      buy_number_requested_date: formatDateForInput(vendor.buy_number_requested_date),
      buy_number_follow_up_date: formatDateForInput(vendor.buy_number_follow_up_date),
      buy_number_received_date: formatDateForInput(vendor.buy_number_received_date),
      buy_number_notes: vendor.buy_number_notes || null,
      po_requested_date: formatDateForInput(vendor.po_requested_date),
      po_sent_date: formatDateForInput(vendor.po_sent_date),
      po_follow_up_date: formatDateForInput(vendor.po_follow_up_date),
      po_received_date: formatDateForInput(vendor.po_received_date),
      po_confirmed_date: formatDateForInput(vendor.po_confirmed_date),
      po_notes: vendor.po_notes || null,
      submittals_requested_date: formatDateForInput(vendor.submittals_requested_date),
      submittals_follow_up_date: formatDateForInput(vendor.submittals_follow_up_date),
      submittals_received_date: formatDateForInput(vendor.submittals_received_date),
      submittals_approved_date: formatDateForInput(vendor.submittals_approved_date),
      submittals_rejected_date: formatDateForInput(vendor.submittals_rejected_date),
      submittals_rejection_reason: vendor.submittals_rejection_reason || null,
      submittals_revision_count: vendor.submittals_revision_count,
      submittals_last_revision_date: formatDateForInput(vendor.submittals_last_revision_date),
      submittals_notes: vendor.submittals_notes || null,
      revised_plans_requested_date: formatDateForInput(vendor.revised_plans_requested_date),
      revised_plans_sent_date: formatDateForInput(vendor.revised_plans_sent_date),
      revised_plans_follow_up_date: formatDateForInput(vendor.revised_plans_follow_up_date),
      revised_plans_confirmed_date: formatDateForInput(vendor.revised_plans_confirmed_date),
      revised_plans_notes: vendor.revised_plans_notes || null,
      equipment_release_requested_date: formatDateForInput(vendor.equipment_release_requested_date),
      equipment_release_follow_up_date: formatDateForInput(vendor.equipment_release_follow_up_date),
      equipment_released_date: formatDateForInput(vendor.equipment_released_date),
      equipment_release_notes: vendor.equipment_release_notes || null,
      closeout_requested_date: formatDateForInput(vendor.closeout_requested_date),
      closeout_follow_up_date: formatDateForInput(vendor.closeout_follow_up_date),
      closeout_received_date: formatDateForInput(vendor.closeout_received_date),
      closeout_approved_date: formatDateForInput(vendor.closeout_approved_date),
      closeout_notes: vendor.closeout_notes || null,
    },
  });

  // Watch for phase changes to update status in real-time
  const currentPhase = form.watch("apm_phase");
  const currentStatus = form.watch("apm_status");
  

  // Get the follow-up date for the currently selected phase (reactive to form changes)
  const getCurrentPhaseFollowUpDate = () => {
    switch (currentPhase) {
      case 'buy_number':
        return vendor.buy_number_follow_up_date;
      case 'po':
        return vendor.po_follow_up_date;
      case 'submittals':
        return vendor.submittals_follow_up_date;
      case 'revised_plans':
        return vendor.revised_plans_follow_up_date;
      case 'equipment_release':
        return vendor.equipment_release_follow_up_date;
      case 'closeouts':
        return vendor.closeout_follow_up_date;
      case 'completed':
        return null;
      default:
        return vendor.next_follow_up_date;
    }
  };

  // Reset form when vendor changes
  useEffect(() => {
    const formattedValues = {
      assigned_apm_user: vendor.assigned_apm_user || "unassigned",
      apm_phase:
        vendor.apm_phase === "quote_confirmed"
          ? "buy_number"
          : vendor.apm_phase,
      apm_status: vendor.apm_status,
      apm_priority: vendor.apm_priority,
      next_follow_up_date: formatDateForInput(vendor.next_follow_up_date),
      cost_amount: vendor.cost_amount ? (typeof vendor.cost_amount === 'number' ? vendor.cost_amount.toString() : vendor.cost_amount) : null,
      final_quote_amount: vendor.final_quote_amount ? (typeof vendor.final_quote_amount === 'number' ? vendor.final_quote_amount.toString() : vendor.final_quote_amount) : null,
      final_quote_confirmed_date: formatDateForInput(vendor.final_quote_confirmed_date),
      final_quote_notes: vendor.final_quote_notes || null,
      buy_number: vendor.buy_number || null,
      buy_number_requested_date: formatDateForInput(vendor.buy_number_requested_date),
      buy_number_follow_up_date: formatDateForInput(vendor.buy_number_follow_up_date),
      buy_number_received_date: formatDateForInput(vendor.buy_number_received_date),
      buy_number_notes: vendor.buy_number_notes || null,
      po_number: vendor.po_number || null,
      po_requested_date: formatDateForInput(vendor.po_requested_date),
      po_sent_date: formatDateForInput(vendor.po_sent_date),
      po_follow_up_date: formatDateForInput(vendor.po_follow_up_date),
      po_received_date: formatDateForInput(vendor.po_received_date),
      po_confirmed_date: formatDateForInput(vendor.po_confirmed_date),
      po_notes: vendor.po_notes || null,
      submittals_requested_date: formatDateForInput(vendor.submittals_requested_date),
      submittals_follow_up_date: formatDateForInput(vendor.submittals_follow_up_date),
      submittals_received_date: formatDateForInput(vendor.submittals_received_date),
      submittals_status: vendor.submittals_status,
      submittals_approved_date: formatDateForInput(vendor.submittals_approved_date),
      submittals_rejected_date: formatDateForInput(vendor.submittals_rejected_date),
      submittals_rejection_reason: vendor.submittals_rejection_reason || null,
      submittals_revision_count: vendor.submittals_revision_count,
      submittals_last_revision_date: formatDateForInput(vendor.submittals_last_revision_date),
      submittals_notes: vendor.submittals_notes || null,
      revised_plans_requested_date: formatDateForInput(vendor.revised_plans_requested_date),
      revised_plans_sent_date: formatDateForInput(vendor.revised_plans_sent_date),
      revised_plans_follow_up_date: formatDateForInput(vendor.revised_plans_follow_up_date),
      revised_plans_confirmed_date: formatDateForInput(vendor.revised_plans_confirmed_date),
      revised_plans_notes: vendor.revised_plans_notes || null,
      equipment_release_requested_date: formatDateForInput(vendor.equipment_release_requested_date),
      equipment_release_follow_up_date: formatDateForInput(vendor.equipment_release_follow_up_date),
      equipment_released_date: formatDateForInput(vendor.equipment_released_date),
      equipment_release_notes: vendor.equipment_release_notes || null,
      closeout_requested_date: formatDateForInput(vendor.closeout_requested_date),
      closeout_follow_up_date: formatDateForInput(vendor.closeout_follow_up_date),
      closeout_received_date: formatDateForInput(vendor.closeout_received_date),
      closeout_approved_date: formatDateForInput(vendor.closeout_approved_date),
      closeout_notes: vendor.closeout_notes || null,
    };
    
    form.reset(formattedValues);
  }, [vendor, form]);

  // Update status when phase changes
  useEffect(() => {
    const newStatus = getStatusForPhase(currentPhase);
    if (newStatus !== currentStatus) {
      form.setValue("apm_status", newStatus);
    }
  }, [currentPhase, form, currentStatus]);

  // Calculate progress based on completed phases
  const calculateProgress = () => {
    const phases = [
      "buy_number",
      "po",
      "submittals",
      "revised_plans",
      "equipment_release",
      "closeouts",
      "completed",
    ];
    const currentPhaseIndex = phases.indexOf(vendor.apm_phase);
    return (currentPhaseIndex / (phases.length - 1)) * 100;
  };


  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Convert form data back to BidVendor format
      const updates: Partial<BidVendor> = {
        ...data,
        // Handle "unassigned" value conversion
        assigned_apm_user:
          data.assigned_apm_user === "unassigned"
            ? null
            : data.assigned_apm_user,
        // Send string quote amounts directly to database (PostgreSQL numeric handles strings)
        cost_amount: data.cost_amount ? data.cost_amount.replace(/[$,]/g, '') : null,
        final_quote_amount: data.final_quote_amount ? data.final_quote_amount.replace(/[$,]/g, '') : null,
        // Ensure dates are properly formatted (convert empty strings to null)
        final_quote_confirmed_date: data.final_quote_confirmed_date || null,
        buy_number_requested_date: data.buy_number_requested_date || null,
        buy_number_follow_up_date: data.buy_number_follow_up_date || null,
        buy_number_received_date: data.buy_number_received_date || null,
        po_requested_date: data.po_requested_date || null,
        po_sent_date: data.po_sent_date || null,
        po_follow_up_date: data.po_follow_up_date || null,
        po_received_date: data.po_received_date || null,
        po_confirmed_date: data.po_confirmed_date || null,
        submittals_requested_date: data.submittals_requested_date || null,
        submittals_follow_up_date: data.submittals_follow_up_date || null,
        submittals_received_date: data.submittals_received_date || null,
        submittals_approved_date: data.submittals_approved_date || null,
        submittals_rejected_date: data.submittals_rejected_date || null,
        submittals_last_revision_date:
          data.submittals_last_revision_date || null,
        revised_plans_requested_date: data.revised_plans_requested_date || null,
        revised_plans_sent_date: data.revised_plans_sent_date || null,
        revised_plans_follow_up_date: data.revised_plans_follow_up_date || null,
        revised_plans_confirmed_date: data.revised_plans_confirmed_date || null,
        equipment_release_requested_date: data.equipment_release_requested_date || null,
        equipment_release_follow_up_date: data.equipment_release_follow_up_date || null,
        equipment_released_date: data.equipment_released_date || null,
        closeout_requested_date: data.closeout_requested_date || null,
        closeout_follow_up_date: data.closeout_follow_up_date || null,
        closeout_received_date: data.closeout_received_date || null,
        closeout_approved_date: data.closeout_approved_date || null,
        next_follow_up_date: data.next_follow_up_date || null,
      };
      
      // Validate numeric strings
      if (updates.cost_amount && typeof updates.cost_amount === 'string' && isNaN(parseFloat(updates.cost_amount))) {
        updates.cost_amount = null;
      }
      if (updates.final_quote_amount && typeof updates.final_quote_amount === 'string' && isNaN(parseFloat(updates.final_quote_amount))) {
        updates.final_quote_amount = null;
      }

      await onUpdate(vendor.id, updates);
      showSuccess("Vendor Updated", "Vendor workflow updated successfully");
      onClose();
    } catch (error) {
      showError(
        "Update Failed",
        error instanceof Error
          ? error.message
          : "Failed to update vendor workflow"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 flex flex-col"
        >
          {/* Progress and Assignment Section */}
          <div className="px-6 pb-6 bg-gray-50 border-b">
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Workflow Progress</span>
                  <span>{Math.round(calculateProgress())}% Complete</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
              </div>

              {/* Current Phase and Status */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <p className="font-medium">Pending:</p>
                  <div className="font-medium">
                    {(() => {
                      const { phases } = getCurrentPhasesWithSoonestFollowUp(vendor);
                      if (phases.length === 0) {
                        return getPhaseDisplayName(currentPhase);
                      }
                      return phases.map(phase => phase.displayName).join(', ');
                    })()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <p className="font-medium">Follow Up:</p>
                  <div className="font-medium">
                    {(() => {
                      const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
                      if (soonestDate) {
                        return formatDateSafe(soonestDate);
                      }
                      return formatDateSafe(getCurrentPhaseFollowUpDate());
                    })()}
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div className="grid grid-cols-1 gap-4 items-center">
                <FormField
                  control={form.control}
                  name="assigned_apm_user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned User</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Workflow Phases Accordion */}
          <div className="flex-1 overflow-y-auto">
            <Accordion
              type="single"
              collapsible
              value={openAccordion}
              onValueChange={setOpenAccordion}
              className="w-full"
            >
              {/* Quote Information Phase */}
              <AccordionItem value="quote" className="border-b">
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Quote Info
                    </div>
                    {vendor.final_quote_confirmed_date && (
                      <span className="text-sm text-green-600">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 space-y-4">
                  <div className="grid grid-row-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost_amount"
                      render={({ field }) => (
                        <FormItem className="flex">
                          <FormLabel className="flex-1/2">Original Quote</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="$0.00"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="final_quote_amount"
                      render={({ field }) => (
                        <FormItem className="flex">
                          <FormLabel className="flex-1/2">Final Quote</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="$0.00"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="final_quote_confirmed_date"
                      render={({ field }) => (
                        <FormItem className="flex">
                          <FormLabel className="flex-1/2">Confirmation</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="final_quote_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Quote information notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Buy# Phase */}
              <AccordionItem
                value="buy_number"
                className="border-b"
              >
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Buy Number
                    </div>
                    {vendor.buy_number_received_date && (
                      <span className="text-sm text-green-600">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 space-y-4">
                  
                  <div className="space-y-2">
                    <div className="grid grid-row-3 gap-4">
                      <FormField
                        control={form.control}
                        name="buy_number_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="buy_number_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buy_number_received_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Received</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="buy_number_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Buy# phase notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* PO Phase */}
              <AccordionItem value="po" className="border-b">
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Purchase Order
                    </div>
                    {vendor.po_received_date && (
                      <span className="text-sm text-green-600">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 space-y-4">
                  
                  <div className="space-y-2">
                    <div className="grid grid-row-3 gap-4">
                      <FormField
                        control={form.control}
                        name="po_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="po_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="po_received_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Received</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="po_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="PO phase notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Submittals Phase */}
              <AccordionItem
                value="submittals"
                className="border-b"
              >
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Submittals
                    </div>
                    {vendor.submittals_received_date && (
                      <span className="text-sm text-green-600">✓ Completed</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="submittals_revision_count"
                      render={({ field }) => (
                        <FormItem className="flex">
                          <FormLabel className="flex-1/3">Revision Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-rows-3 gap-4">
                      <FormField
                        control={form.control}
                        name="submittals_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="submittals_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="submittals_received_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Received</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  

                  <FormField
                    control={form.control}
                    name="submittals_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Submittals phase notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Revised Plans Phase */}
              <AccordionItem
                value="revised_plans"
                className="border-b"
              >
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Revised Plans
                    </div>
                    {vendor.revised_plans_confirmed_date && (
                      <span className="text-sm text-green-600">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 space-y-4">
                  <div className="space-y-2">
                    <div className="grid grid-row-3 gap-4">
                      <FormField
                        control={form.control}
                        name="revised_plans_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="revised_plans_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="revised_plans_confirmed_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Received</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="revised_plans_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Revised plans phase notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Equipment Release Phase */}
              <AccordionItem
                value="equipment_release"
                className="border-b"
              >
                <AccordionTrigger className="hover:no-underline rounded-none px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Equipment Release
                    </div>
                    {vendor.equipment_released_date && (
                      <span className="text-sm text-green-600">✓ Released</span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="space-y-2">
                    <div className="grid grid-row-3 gap-4">
                      <FormField
                        control={form.control}
                        name="equipment_release_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="equipment_release_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="equipment_released_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Released</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="equipment_release_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel className="">Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Equipment release notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Closeouts Phase */}
              <AccordionItem
                value="closeouts"
                className="border-b"
              >
                <AccordionTrigger className="hover:no-underline px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">
                      Closeouts
                    </div>
                    {vendor.closeout_received_date && (
                      <span className="text-sm text-green-600">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <div className="space-y-2">
                    <div className="grid grid-row-3 gap-4">
                      <FormField
                        control={form.control}
                        name="closeout_requested_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Requested</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="closeout_follow_up_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Follow Up</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="closeout_received_date"
                        render={({ field }) => (
                          <FormItem className="flex">
                            <FormLabel className="flex-1/3">Received</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="closeout_notes"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Closeouts phase notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Footer Actions */}
          <div className="border-t bg-gray-50 p-6">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default APMVendorWorkflowForm;
