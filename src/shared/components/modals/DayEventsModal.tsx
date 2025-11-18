import React from "react";
import { useNavigate } from "react-router-dom";
import type { Bid, BidVendor, Vendor, User } from "../../types";
import { getStatusColor } from "../../utils/statusUtils";
import DialogModal from "../ui/DialogModal";
import {
  DocumentIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";

interface CalendarEvent {
  id: string;
  title: string;
  type: "bid_due" | "vendor_due" | "apm_task";
  date: Date;
  status?: string;
  bid?: Bid;
  vendor?: Vendor;
  bidVendor?: BidVendor;
  user?: User;
  phase?: string;
  urgency?: string;
}

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
  onEventClick,
}) => {
  const navigate = useNavigate();

  if (!selectedDate) return null;

  // Helper function to get notes for a specific phase
  const getPhaseNotes = (
    bidVendor: BidVendor,
    urgency?: string
  ): string | null => {
    if (!urgency) return null;

    switch (urgency) {
      case "buy_number":
        return bidVendor.buy_number_notes;
      case "po":
        return bidVendor.po_notes;
      case "submittals":
        return bidVendor.submittals_notes;
      case "revised_plans":
        return bidVendor.revised_plans_notes;
      case "equipment_release":
        return bidVendor.equipment_release_notes;
      case "closeouts":
        return bidVendor.closeout_notes;
      default:
        return null;
    }
  };

  // Helper function to get follow-up date from urgency field
  const getPhaseFollowUpDate = (
    bidVendor: BidVendor,
    urgency?: string
  ): string | null => {
    if (!urgency) return null;

    switch (urgency) {
      case "buy_number":
        return bidVendor.buy_number_follow_up_date;
      case "po":
        return bidVendor.po_follow_up_date;
      case "submittals":
        return bidVendor.submittals_follow_up_date;
      case "revised_plans":
        return bidVendor.revised_plans_follow_up_date;
      case "equipment_release":
        return bidVendor.equipment_release_follow_up_date;
      case "closeouts":
        return bidVendor.closeout_follow_up_date;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group events by type
  const bidDueEvents = events.filter((event) => event.type === "bid_due");
  const vendorDueEvents = events.filter((event) => event.type === "vendor_due");
  const apmTaskEvents = events.filter((event) => event.type === "apm_task");

  // Get color scheme for each APM phase (matching Calendar.tsx)
  const getPhaseColor = (phaseName: string) => {
    switch (phaseName) {
      case "buy_number":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          hover: "hover:bg-purple-100",
        };
      case "po":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          hover: "hover:bg-blue-100",
        };
      case "submittals":
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          hover: "hover:bg-orange-100",
        };
      case "revised_plans":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          hover: "hover:bg-yellow-100",
        };
      case "equipment_release":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          hover: "hover:bg-green-100",
        };
      case "closeouts":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          hover: "hover:bg-red-100",
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          hover: "hover:bg-gray-100",
        };
    }
  };

  const getEventStyle = (event: CalendarEvent) => {
    if (event.type === "bid_due") {
      return "bg-blue-50 border-blue-200 hover:bg-blue-100";
    } else if (event.type === "vendor_due") {
      return "bg-red-50 border-red-200 hover:bg-red-100";
    } else if (event.type === "apm_task" && event.urgency) {
      const colors = getPhaseColor(event.urgency);
      return `${colors.bg} ${colors.border} ${colors.hover}`;
    }
    return "bg-gray-50 border-gray-200 hover:bg-gray-100";
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.type === "bid_due") {
      return <DocumentIcon className="w-4 h-4 text-blue-600" />;
    } else if (event.type === "vendor_due") {
      return <CurrencyDollarIcon className="w-4 h-4 text-red-600" />;
    } else if (event.type === "apm_task") {
      return <CalendarIcon className="w-4 h-4 text-green-600" />;
    }
    return <CalendarIcon className="w-4 h-4 text-gray-600" />;
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Events for ${formatDate(selectedDate)}`}
      description={`${events.length} event${
        events.length !== 1 ? "s" : ""
      } scheduled`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Bid Due Events */}
        {bidDueEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bid Due Dates ({bidDueEvents.length})
              </h3>
            </div>
            <div className="space-y-2">
              {bidDueEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${getEventStyle(
                    event
                  )}`}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {event.title}
                      </h4>
                      {event.status && (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                      )}
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendor Cost Due Events */}
        {vendorDueEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Vendor Costs Due ({vendorDueEvents.length})
              </h3>
            </div>
            <div className="space-y-2">
              {vendorDueEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${getEventStyle(
                    event
                  )}`}
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {event.title}
                      </h4>
                      {event.vendor && (
                        <p className="text-sm text-gray-600">
                          {event.vendor.contact_person &&
                            `Contact: ${event.vendor.contact_person}`}
                          {event.vendor.phone && ` • ${event.vendor.phone}`}
                        </p>
                      )}
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APM Task Events */}
        {apmTaskEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">
                Follow-up Tasks ({apmTaskEvents.length})
              </h3>
            </div>
            <div className="space-y-3">
              {apmTaskEvents.map((event) => {
                const followUpDate =
                  event.bidVendor && event.urgency
                    ? getPhaseFollowUpDate(event.bidVendor, event.urgency)
                    : null;
                const phaseNotes =
                  event.bidVendor && event.urgency
                    ? getPhaseNotes(event.bidVendor, event.urgency)
                    : null;

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border transition-colors ${getEventStyle(
                      event
                    )}`}
                  >
                    {/* Phase and Button */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">
                          {event.phase}
                        </h4>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          navigate(`/apm/project/${event.bid?.id}`)
                        }
                        className="flex items-center gap-1 ml-4 bg-[#d4af37] hover:bg-[#b8941f] text-white"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        Go to Project
                      </Button>
                    </div>

                    {/* Row 2: Project | General Contractor | Empty */}
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Project:</span>
                        <div className="font-medium text-gray-900">
                          {event.bid?.project_name}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">General Contractor:</span>
                        <div className="font-medium text-gray-900">
                          {event.bid?.general_contractor || "—"}
                        </div>
                      </div>
                      <div>
                        {/* Empty column */}
                      </div>
                    </div>

                    {/* Row 3: Vendor | Follow Up Date | Assigned User */}
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Vendor:</span>
                        <div className="font-medium text-gray-900">
                          {event.vendor?.company_name}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Follow Up Date:</span>
                        <div className="font-medium text-gray-900">
                          {followUpDate
                            ? new Date(followUpDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Assigned User:</span>
                        <div className="font-medium">
                          {event.user ? (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {event.user.name}
                            </span>
                          ) : (
                            <span className="text-orange-600 font-medium">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {phaseNotes && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-gray-500 text-sm">Notes:</span>
                        <div className="text-gray-900 text-sm mt-1">
                          {phaseNotes}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <CalendarIcon className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500">No events scheduled for this date</p>
          </div>
        )}
      </div>
    </DialogModal>
  );
};

export default DayEventsModal;
