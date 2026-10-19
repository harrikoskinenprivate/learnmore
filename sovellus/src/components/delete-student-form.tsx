"use client";

import { deleteStudent } from "@/app/actions/students";

export function DeleteStudentForm({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  return (
    <form
      action={deleteStudent}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Poistetaanko oppilas ${studentName}? Tunnus, avainlinkki, oppijakortti ja istunnot poistuvat.`,
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={studentId} />
      <button
        type="submit"
        className="h-11 rounded-md px-3 text-base text-danger hover:bg-danger-bg"
      >
        Poista
      </button>
    </form>
  );
}
