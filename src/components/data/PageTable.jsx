import { useMemo, useState } from "react";
import { DataTable, Pagination } from "quickit-ui";
import TableSkeleton from "@/components/feedback/TableSkeleton";
import ListEmptyState from "@/components/feedback/ListEmptyState";

export default function PageTable({
  columns,
  data,
  rowKey,
  loading,
  limit = 25,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyActions,
  skeletonRows = 6,
  stickyHeader,
  color,
  onRowClick,
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(data.length / limit));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
  }, [data, page, limit]);

  function handlePageChange(nextPage) {
    setPage(nextPage);
    if (onRowClick) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return <TableSkeleton columns={columns} rows={skeletonRows} />;
  }

  if (data.length === 0) {
    return (
      <ListEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actions={emptyActions}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={paginatedData}
        rowKey={rowKey}
        stickyHeader={stickyHeader}
        color={color}
        onRowClick={onRowClick}
      />
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            count={totalPages}
            page={page}
            onPageChange={handlePageChange}
            color="neutral"
          />
        </div>
      )}
    </div>
  );
}
