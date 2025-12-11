import { dbOperations } from './supabase';

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
        // Move to active by clearing both archive and hold status
        dbOperations.updateBid(bidId, {
          on_hold: false,
          archived: false,
          updated_at: new Date().toISOString()
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
        // Archive projects using new activity cycle approach
        dbOperations.updateBid(bidId, {
          archived: true,
          updated_at: new Date().toISOString(),
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
          updated_at: new Date().toISOString(),
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

  /**
   * APM-specific: Move multiple bids to active status in APM view
   */
  async apmBulkMoveToActive(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          apm_on_hold: false,
          apm_archived: false,
          updated_at: new Date().toISOString()
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to move APM bid ${bidIds[index]} to active: ${result.reason}`);
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
   * APM-specific: Archive multiple bids in APM view
   */
  async apmBulkArchive(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          apm_on_hold: false,
          apm_archived: true,
          updated_at: new Date().toISOString()
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to archive APM bid ${bidIds[index]}: ${result.reason}`);
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
   * APM-specific: Move multiple bids to on-hold status in APM view
   */
  async apmBulkOnHold(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          apm_archived: false,
          apm_on_hold: true,
          updated_at: new Date().toISOString()
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to put APM bid ${bidIds[index]} on hold: ${result.reason}`);
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
   * Remove multiple bids from APM (unsend from APM back to Estimating only)
   */
  async bulkUnsendFromAPM(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          sent_to_apm: false,

          apm_on_hold: false,

          apm_archived: false,
          updated_at: new Date().toISOString()
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to remove bid ${bidIds[index]} from APM: ${result.reason}`);
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
   * Send multiple bids to APM team
   */
  async bulkSendToAPM(bidIds: number[]): Promise<BulkOperationResult> {
    const errors: string[] = [];
    let successCount = 0;

    const results = await Promise.allSettled(
      bidIds.map(bidId => 
        dbOperations.updateBid(bidId, {
          sent_to_apm: true,
          updated_at: new Date().toISOString()
        })
      )
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errors.push(`Failed to send bid ${bidIds[index]} to APM: ${result.reason}`);
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