import type {RowVariant} from "../../models/ui/tableModels";

export function rowBackgroundClasses(
    variant: RowVariant | null | undefined,
): string {
    switch (variant) {
        case "primary":
            return "bg-blue-500 hover:bg-blue-600 dark:bg-blue-800 dark:hover:bg-blue-900";

        case "secondary":
            return "bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-800";

        case "success":
            return "bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-700";

        case "info":
            return "bg-blue-100 hover:bg-blue-200 dark:bg-blue-700 dark:hover:bg-blue-600";

        case "warning":
            return "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-600 dark:hover:bg-yellow-500";

        case "danger":
            return "bg-red-100 hover:bg-red-200 dark:bg-red-600 dark:hover:bg-red-500";

        case "light":
            return "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600";

        case "dark":
            return "bg-gray-800 hover:bg-gray-900 dark:bg-gray-900 dark:hover:bg-gray-800";

        case "link":
            return "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300";

        default:
            return "hover:bg-gray-100 dark:hover:bg-gray-700";
    }
}
