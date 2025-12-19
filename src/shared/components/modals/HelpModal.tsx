import React from "react";
import DialogModal from "../ui/DialogModal";
import { Button } from "../ui/Button";
import type { TeamView } from "../../contexts/UserContext";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: TeamView;
  userRole?: string | null;
}

const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  currentView,
  userRole,
}) => {
  const accent = currentView === "apm" ? "text-green-700" : "text-blue-700";
  const badge = currentView === "apm" ? "bg-green-50 text-green-800" : "bg-blue-50 text-blue-800";

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Help"
      description="Quick guide to using the Bid Board"
      size="lg"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="default" onClick={onClose} className="flex-1">
            Got it
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-700">You’re currently in</span>
          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${badge}`}>
            {currentView === "apm" ? "APM" : "Estimating"}
          </span>
          {userRole ? (
            <span className="text-xs text-gray-500">Role: {userRole}</span>
          ) : null}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className={`font-semibold ${accent}`}>Quick start</p>
          <ol className="mt-2 space-y-2 text-sm text-gray-800 list-decimal pl-5">
            <li>
              Use the <span className="font-semibold">left sidebar</span> to switch pages.
            </li>
            <li>
              On a list page, click a row to <span className="font-semibold">open details</span> (notes, dates, contacts).
            </li>
            <li>
              Use <span className="font-semibold">Calendar</span> to see deadlines and plan follow-ups.
            </li>
            <li>
              Keep <span className="font-semibold">Contacts</span> updated so you can quickly reach vendors.
            </li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900">Estimating workflow</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>
                Track active work in <span className="font-semibold">Active Bids</span> / <span className="font-semibold">Follow Ups</span>.
              </li>
              <li>
                Move paused items to <span className="font-semibold">On-Hold</span>.
              </li>
              <li>
                When a bid is ready, send it to <span className="font-semibold">Bids to APM</span>.
              </li>
              <li>
                Finished items belong in <span className="font-semibold">Closed Bids</span>.
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-900">APM workflow</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>
                Manage projects in <span className="font-semibold">Active Projects</span>.
              </li>
              <li>
                Track closeout work in <span className="font-semibold">Pending Closeouts</span>.
              </li>
              <li>
                Completed work goes to <span className="font-semibold">Closed Projects</span>.
              </li>
              <li>
                Use <span className="font-semibold">Contacts</span> for vendor coordination.
              </li>
            </ul>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <p className="font-semibold text-gray-900">Tips</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li>
              If something looks missing, check your <span className="font-semibold">role/view</span>.
            </li>
            <li>
              Use the <span className="font-semibold">Settings</span> icon to update your profile.
            </li>
            <li>
              You can reopen this guide anytime from the <span className="font-semibold">Help</span> icon.
            </li>
          </ul>
        </div>
      </div>
    </DialogModal>
  );
};

export default HelpModal;
