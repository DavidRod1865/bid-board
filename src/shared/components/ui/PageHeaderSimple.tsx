import React from "react";
import {
  TrashIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  PauseIcon,
  ArchiveBoxIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface PageHeaderSimpleProps {
  title: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
  };
  secondaryActionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
  };
  tertiaryActionButton?: {
    label: string;
    onClick: () => void;
    color?: "green" | "blue" | "yellow";
    disabled?: boolean;
  };
  bulkActions?: {
    selectedCount: number;
    actions: Array<{
      label: string;
      onClick: () => void;
      color?: "blue" | "yellow" | "orange";
    }>;
    onDelete?: () => void;
  };
}

const PageHeaderSimple: React.FC<PageHeaderSimpleProps> = ({
  title,
  actionButton,
  secondaryActionButton,
  tertiaryActionButton,
  bulkActions,
}) => {
  return (
    <div className="bg-gray-50">
      {/* Main Header: Title, Action Buttons, Bulk Actions */}
      <div className="px-6 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="items-center">
            <h1 className="text-2xl h-10 font-bold text-gray-900">{title}</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Regular Action Buttons - show when no bulk actions are active */}
            {!(bulkActions && bulkActions.selectedCount > 0) && (
              <>
                {/* Action Button */}
                {actionButton && (
                  <button
                    onClick={actionButton.onClick}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    actionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : actionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : actionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  }
                    `}
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {actionButton.label}
                  </button>
                )}

                {/* Secondary Action Button */}
                {secondaryActionButton && (
                  <button
                    onClick={secondaryActionButton.onClick}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    secondaryActionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : secondaryActionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : secondaryActionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  }
                    `}
                  >
                    {secondaryActionButton.color === "blue" ? (
                      <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                    ) : (
                      <PlusIcon className="w-5 h-5 mr-2" />
                    )}
                    {secondaryActionButton.label}
                  </button>
                )}

                {/* Tertiary Action Button */}
                {tertiaryActionButton && (
                  <button
                    onClick={tertiaryActionButton.onClick}
                    disabled={tertiaryActionButton.disabled}
                    className={`
                  inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    tertiaryActionButton.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                  ${
                    tertiaryActionButton.color === "green"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : tertiaryActionButton.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : tertiaryActionButton.color === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                      : "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                  }
                    `}
                  >
                    <EnvelopeIcon className="w-5 h-5 mr-2" />
                    {tertiaryActionButton.label}
                  </button>
                )}
              </>
            )}

            {/* Bulk Actions Dropdown - show when bulk actions are active */}
            {bulkActions && bulkActions.selectedCount > 0 && (
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap">
                      Bulk Actions ({bulkActions.selectedCount})
                      <ChevronDownIcon className="w-4 h-4 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {bulkActions.actions.map((action, index) => {
                      const getActionIcon = (label: string) => {
                        if (label.toLowerCase().includes("hold"))
                          return <PauseIcon className="w-4 h-4" />;
                        if (label.toLowerCase().includes("archive"))
                          return <ArchiveBoxIcon className="w-4 h-4" />;
                        if (
                          label.toLowerCase().includes("apm") ||
                          label.toLowerCase().includes("send")
                        )
                          return <PaperAirplaneIcon className="w-4 h-4" />;
                        return <DocumentDuplicateIcon className="w-4 h-4" />;
                      };

                      return (
                        <DropdownMenuItem
                          key={index}
                          onClick={action.onClick}
                          className="cursor-pointer"
                        >
                          {getActionIcon(action.label)}
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}

                    {/* Separator before delete if delete action exists and there are other actions */}
                    {bulkActions.onDelete && (
                      <>
                        {bulkActions.actions.length > 0 && (
                          <DropdownMenuSeparator />
                        )}
                        <DropdownMenuItem
                          onClick={bulkActions.onDelete}
                          variant="destructive"
                          className="cursor-pointer"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeaderSimple;