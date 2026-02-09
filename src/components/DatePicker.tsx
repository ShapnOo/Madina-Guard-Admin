import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  noTruncate?: boolean;
}

function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DatePicker({ value, onChange, placeholder = "Pick a date", className, noTruncate = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-start text-left font-medium border-border/70 bg-card hover:bg-secondary/50 hover:text-foreground rounded-lg",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className={cn(noTruncate ? "whitespace-nowrap" : "truncate")}>{value ? toDisplayDate(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl border-border/80 overflow-hidden shadow-xl" align="start" sideOffset={8}>
        <div className="w-[336px] bg-card">
          <div className="border-b border-border bg-[linear-gradient(110deg,hsl(var(--primary)/0.14),hsl(var(--background))_65%)] px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Select Date</p>
            <p className="text-sm font-semibold mt-0.5">{value ? toDisplayDate(value) : "No date selected"}</p>
          </div>
          <div className="px-2.5 py-2">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(date) => {
                if (!date) return;
                onChange(toIsoDate(date));
                setOpen(false);
              }}
              className="p-1"
              classNames={{
                months: "flex flex-col space-y-2",
                month: "space-y-2",
                caption: "flex justify-between items-center px-2 py-1",
                caption_label: "text-sm font-semibold",
                nav: "flex items-center gap-1",
                nav_button: "h-7 w-7 rounded-md border border-border bg-background p-0 text-foreground hover:bg-secondary hover:text-foreground",
                nav_button_previous: "relative left-0",
                nav_button_next: "relative right-0",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "w-10 text-center text-[11px] font-medium text-muted-foreground",
                row: "flex w-full mt-1.5",
                cell: "h-10 w-10 p-0 text-center",
                day: "h-9 w-9 rounded-md p-0 font-medium hover:bg-secondary hover:text-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                day_today: "bg-primary/10 text-primary",
                day_outside: "text-muted-foreground/40",
              }}
              components={{
                IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                IconRight: () => <ChevronRight className="h-4 w-4" />,
              }}
              initialFocus
            />
          </div>
          <div className="border-t border-border bg-card px-3 py-2.5 grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs hover:text-foreground"
              onClick={() => {
                onChange(toIsoDate(new Date()));
                setOpen(false);
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
