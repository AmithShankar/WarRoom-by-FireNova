"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // 'yyyy-MM-dd'
  onChange: (value: string) => void;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const parsed = value ? parseISO(value) : new Date();
  const selected = isValid(parsed) ? parsed : new Date();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const pick = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-border-1 bg-surface-1 px-3 text-sm text-text-1 transition-colors hover:border-border-strong focus:border-brand-from focus:outline-none focus:ring-2 focus:ring-brand-from/30",
            className,
          )}
        >
          <Calendar className="h-4 w-4 text-text-3" />
          {value && isValid(parsed)
            ? format(selected, "MMM d, yyyy")
            : "Pick a date"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-text-1">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-[10px] font-medium uppercase text-text-3"
            >
              {w}
            </div>
          ))}
          {days.map((day) => {
            const isSelected = isSameDay(day, selected);
            const outside = !isSameMonth(day, viewMonth);
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => pick(day)}
                aria-pressed={isSelected}
                aria-current={isToday(day) ? "date" : undefined}
                className={cn(
                  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-linear-to-br from-brand-from to-brand-to font-semibold text-white"
                    : outside
                      ? "text-text-3 hover:bg-surface-2"
                      : "text-text-1 hover:bg-surface-2",
                  !isSelected && isToday(day) && "ring-1 ring-border-strong",
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const t = new Date();
            setViewMonth(startOfMonth(t));
            pick(t);
          }}
          className="mt-2 w-full cursor-pointer rounded-md py-1.5 text-xs font-medium text-brand-from transition-colors hover:bg-surface-2"
        >
          Today
        </button>
      </PopoverContent>
    </Popover>
  );
}
