import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  const getPageNumbers = useCallback((): Array<number | "..."> => {
    const maxVisible = 7;
    const sideCount = Math.floor((maxVisible - 3) / 2);

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: Array<number | "..."> = [1];
    const start = Math.max(2, currentPage - sideCount);
    const end = Math.min(totalPages - 1, currentPage + sideCount);

    if (start > 2) pages.push("...");

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < totalPages - 1) pages.push("...");

    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(1);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <motion.div
      className={`font-open-sans flex items-center justify-center gap-1 ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="border-line text-heading hover:bg-light-bg cursor-pointer rounded-lg border bg-white p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) =>
          page === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="text-body px-2 py-2 text-sm"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={`page-${page}`}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={currentPage === page ? "page" : undefined}
              aria-label={`Go to page ${page}`}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out ${
                currentPage === page
                  ? "bg-primary text-white"
                  : "border-line text-heading hover:bg-light-bg border bg-white"
              }`}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          currentPage < totalPages && onPageChange(currentPage + 1)
        }
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="border-line text-heading hover:bg-light-bg cursor-pointer rounded-lg border bg-white p-2 transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
