export const isJobAssignedToCurrentInterpreter = (job, interpreterId) =>
  Boolean(
    job &&
      interpreterId &&
      job.assigned_interpreter_id &&
      String(job.assigned_interpreter_id) === String(interpreterId)
  );
