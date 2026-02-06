// src/domain/staff-register/service.ts
// Minimal and reusable service layer for staff register (check-in/out)
// All code and comments in English

import { CheckInOutStatus } from '@/enums/CheckInOutStatus'
import * as domain from './domain'

export class StaffRegisterService {
  // Create a check-in or check-out event
  async createStamp(entry: any) {
    // entry should contain work_day_id, timeIn or timeOut, etc.
    await domain.createWorkEntry(entry)
  }

  // Get all stamp events (history)
  async getStampHistory(work_day_id?: number) {
    const all = await domain.getAllWorkEntries()
    return work_day_id ? all.filter((e) => e.work_day_id === work_day_id) : all
  }

  // Get current status (checked in or out) for a work day
  async getCurrentStatus(work_day_id: number): Promise<CheckInOutStatus> {
    const all = await domain.getAllWorkEntries()
    const todays = all.filter((e) => e.work_day_id === work_day_id)
    // If there is an open check-in (timeIn set, timeOut missing), status is checked-in
    const open = [...todays].reverse().find((e) => e.check_in_at && !e.check_out_at)
    return open ? CheckInOutStatus.CHECKED_IN : CheckInOutStatus.CHECKED_OUT
  }

  // Reset all local data (for development only)
  async resetLocal() {
    // This would call a repo/db util to clear all local work_entries
    // Example:
    // await domain.deleteAllWorkEntries()
    // Or, if you want to keep the API clean, expose a reset in domain/repo
    throw new Error('Not implemented: resetLocal')
  }
}
