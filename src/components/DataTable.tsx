import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="data-table-wrapper"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-4"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} hover:bg-secondary/30`}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className="py-3.5 px-4 text-sm">
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                No records found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
}
