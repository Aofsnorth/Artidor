"use client";

import type * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/utils/ui";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4",
				monthCaption: "flex justify-center pt-1 relative items-center",
				captionLabel: "text-sm font-medium",
				nav: "space-x-1 flex items-center",
				navButton: cn(
					buttonVariants({ variant: "outline" }),
					"size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				previousMonthButton: "absolute left-1",
				nextMonthButton: "absolute right-1",
				table: "w-full border-collapse space-y-1",
				headRow: "flex",
				headCell:
					"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
				row: "flex w-full mt-2",
				cell: cn(
					"relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
					props.mode === "range"
						? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
						: "[&:has([aria-selected])]:rounded-md",
				),
				day: cn(
					buttonVariants({ variant: "text" }),
					"size-8 p-0 font-normal aria-selected:opacity-100",
				),
				dayRangeStart: "day-range-start",
				dayRangeEnd: "day-range-end",
				daySelected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
				dayToday: "bg-accent text-accent-foreground",
				dayOutside:
					"day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
				dayDisabled: "text-muted-foreground opacity-50",
				dayRangeMiddle:
					"aria-selected:bg-accent aria-selected:text-accent-foreground",
				dayHidden: "invisible",
				...classNames,
			}}
			components={{
				PreviousMonthButton: () => <ChevronLeft className="size-4" />,
				NextMonthButton: () => <ChevronRight className="size-4" />,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
