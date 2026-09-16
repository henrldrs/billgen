import { daysOverdue } from "./invoiceStatus";

// A fixed "today" so the assertions do not move with the calendar.
const TODAY = new Date(2026, 8, 16); // 16 September 2026

test("an issued invoice past its due date is overdue by the day count", () => {
  expect(daysOverdue({ status: "issued", due_date: "2026-08-04" }, TODAY)).toBe(43);
  expect(daysOverdue({ status: "partially_paid", due_date: "2026-09-15" }, TODAY)).toBe(1);
});

test("due today is still on time, and tomorrow is not late", () => {
  expect(daysOverdue({ status: "issued", due_date: "2026-09-16" }, TODAY)).toBeNull();
  expect(daysOverdue({ status: "issued", due_date: "2026-09-17" }, TODAY)).toBeNull();
});

test("closed and unissued invoices are never overdue, nor is an undated one", () => {
  expect(daysOverdue({ status: "paid", due_date: "2026-01-01" }, TODAY)).toBeNull();
  expect(daysOverdue({ status: "voided", due_date: "2026-01-01" }, TODAY)).toBeNull();
  expect(daysOverdue({ status: "draft", due_date: "2026-01-01" }, TODAY)).toBeNull();
  expect(daysOverdue({ status: "issued", due_date: null }, TODAY)).toBeNull();
});

test("a status the server already refined keeps its age", () => {
  expect(daysOverdue({ status: "overdue", due_date: "2026-09-01" }, TODAY)).toBe(15);
});

test("the count survives a clock change inside the window", () => {
  // 25 October 2026 is the night Belgium leaves summer time: one 25-hour day.
  // A millisecond division without the midnight snap would read 6.96 days.
  expect(daysOverdue({ status: "issued", due_date: "2026-10-22" }, new Date(2026, 9, 29))).toBe(7);
});
