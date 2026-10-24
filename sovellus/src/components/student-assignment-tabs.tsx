import { AssignmentCards } from "@/components/assignment-cards";
import { AssignmentStateTabs } from "@/components/assignment-state-tabs";
import { teacherWorkLabel, withFeedback } from "@/lib/assignment-labels";
import { formatDeadline } from "@/lib/deadline";
import type { TeacherWorkItem } from "@/lib/types";

function bySoonestDeadline(a: TeacherWorkItem, b: TeacherWorkItem): number {
  if (a.deadline && b.deadline) {
    const diff = a.deadline.getTime() - b.deadline.getTime();
    if (diff !== 0) {
      return diff;
    }
  } else if (a.deadline) {
    return -1;
  } else if (b.deadline) {
    return 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function byLatestReturn(a: TeacherWorkItem, b: TeacherWorkItem): number {
  const diff = (b.returnedAt?.getTime() ?? 0) - (a.returnedAt?.getTime() ?? 0);
  if (diff !== 0) {
    return diff;
  }
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function taskMeta(item: TeacherWorkItem): string {
  const parts = [teacherWorkLabel(item)];
  if (item.deadline) {
    parts.push(`Määräaika ${formatDeadline(item.deadline)}`);
  }
  if (item.returnedAt) {
    parts.push(`Palautettu ${formatDeadline(item.returnedAt)}`);
  }
  return withFeedback(item.parentTitle, parts.join(" · "));
}

export function StudentAssignmentTabs({
  studentId,
  studentName,
  items,
}: {
  studentId: string;
  studentName: string;
  items: TeacherWorkItem[];
}) {
  const open = items.filter((item) => !item.returnedAt).sort(bySoonestDeadline);
  const returned = items.filter((item) => item.returnedAt).sort(byLatestReturn);

  return (
    <AssignmentStateTabs
      ariaLabel={`${studentName}: tehtävät`}
      idPrefix={`${studentId}-`}
      initial="kesken"
      tabs={[
        {
          id: "kesken",
          label: "Kesken",
          panel: (
            <AssignmentCards
              empty="Ei kesken olevia tehtäviä."
              items={open.map((item) => ({
                id: item.assignmentId,
                href: `/oppilaat/${studentId}/tehtavat/${item.assignmentId}`,
                title: item.title,
                meta: taskMeta(item),
                late: item.late,
              }))}
            />
          ),
        },
        {
          id: "palautetut",
          label: "Palautetut",
          panel: (
            <AssignmentCards
              empty="Ei palautettuja tehtäviä."
              items={returned.map((item) => ({
                id: item.assignmentId,
                href: `/oppilaat/${studentId}/tehtavat/${item.assignmentId}`,
                title: item.title,
                meta: taskMeta(item),
              }))}
            />
          ),
        },
      ]}
    />
  );
}
