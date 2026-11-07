// Only trusted infrastructure errors receive overload/restart instructions; source errors keep their own path.
const ERRORS = {
  HOSTED_TOOL_BUSY: {
    error: 'Hosted tool queue is full; retry this read shortly.', retryable: true, retry_after_seconds: 5,
    recovery: 'Wait at least five seconds, then retry the same read arguments. Use smaller batches if the queue stays full.',
  },
  HOSTED_TOOL_UNAVAILABLE: {
    error: 'Hosted tool worker is unavailable; retry after the server restarts.', retryable: false, requires_restart: true,
    recovery: 'The operator must restart the hosted service. After recovery, retry the same read arguments.',
  },
  HOSTED_TOOL_CLOSED: {
    error: 'Hosted tool worker is closed.', retryable: false, requires_restart: true,
    recovery: 'The hosted service has closed. Retry the same read arguments after the service restarts.',
  },
  HOSTED_TOOL_DISPATCH_FAILED: {
    error: 'Hosted tool dispatch failed.', retryable: false,
    recovery: 'Report this service error to the operator and keep the original read arguments.',
  },
  HOSTED_TOOL_EXECUTION_FAILED: {
    error: 'Hosted tool execution failed.', retryable: false,
    recovery: 'Report this service error to the operator and keep the original read arguments.',
  },
};

export class HostedToolError extends Error {
  constructor(code) {
    if (!Object.hasOwn(ERRORS, code)) throw new Error('Unknown hosted infrastructure error code.');
    super(ERRORS[code].error);
    this.name = 'HostedToolError';
    this.code = code;
  }

  response() { return { ...ERRORS[this.code], code: this.code }; }
}
