import { CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InformationCircleIcon className="size-4" />,
        warning: <ExclamationTriangleIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <div className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />,
      }}
      toastOptions={{
        style: {
          borderRadius: "0.75rem",
          border: "1px solid rgb(229 231 235)",
          fontSize: "0.875rem",
        },
        className: "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
      }}
      {...props}
    />
  )
}

export { Toaster }
