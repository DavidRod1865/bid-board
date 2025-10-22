import { dbOperations } from '../lib/supabase';

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: string[];
}

class BulkOperationsService {
  /**
   * Move multiple bids to active status (remove on_hold and archived flags)
   */
  async bulkMoveToActive(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          on_hold: false,
          on_hold_at: null,
          on_hold_by: null,
          archived: false,
          archived_at: null,
          archived_by: null
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to move bid ${bidIds[index]} to active: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      successCount,
      failureCount: bidIds.length - successCount,
      errors
    };
  }

  /**
   * Archive multiple bids
   * This also clears on-hold status if items were on-hold
   */
  async bulkArchive(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        // First clear on-hold status, then archive
        dbOperations.updateBid(bidId, {
          on_hold: false,
          on_hold_at: null,
          on_hold_by: null,
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: null // Using null for now
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to archive bid ${bidIds[index]}: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      successCount,
      failureCount: bidIds.length - successCount,
      errors
    };
  }

  /**
   * Move multiple bids to on-hold status
   * This also unarchives items if they were archived
   */
  async bulkOnHold(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          on_hold: true,
          on_hold_at: new Date().toISOString(),
          on_hold_by: null, // TODO: Get current user ID
          // Also unarchive if the item was archived
          archived: false,
          archived_at: null,
          archived_by: null
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to move bid ${bidIds[index]} to on-hold: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      successCount,
      failureCount: bidIds.length - successCount,
      errors
    };
  }

  /**
   * Delete multiple bids permanently
   */
  async bulkDelete(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => dbOperations.deleteBid(bidId))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to delete bid ${bidIds[index]}: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      successCount,
      failureCount: bidIds.length - successCount,
      errors
    };
  }

  /**
   * Restore multiple bids from archives (unarchive)
   */
  async bulkUnarchive(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => dbOperations.unarchiveBid(bidId))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to unarchive bid ${bidIds[index]}: ${result.reason}`);
      }
    });

    return {
      success: errors.length === 0,
      successCount,
      failureCount: bidIds.length - successCount,
      errors
    };
  }
}

export const bulkOperations = new BulkOperationsService();