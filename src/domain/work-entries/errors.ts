export class WorkEntryValidationError extends Error {
  constructor(message: string) {
    super(message)

    this.name = 'WorkEntryValidationError'
  }
}

export class SyncConflictError extends Error {
  constructor(message: string) {
    super(message)

    this.name = 'SyncConflictError'
  }
}
