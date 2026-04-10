import { ExitCode } from './constants.js';

export class CliError extends Error {
  public readonly exitCode: number;
  public readonly hint?: string | undefined;

  constructor(message: string, exitCode: number = ExitCode.General, hint?: string) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof CliError) {
    const lines = [`\u2717 Error: ${error.message}`];
    if (error.hint) {
      lines.push('', `  ${error.hint}`);
    }
    return lines.join('\n');
  }

  if (error instanceof Error) {
    return `\u2717 Error: ${error.message}`;
  }

  return '\u2717 Error: An unexpected error occurred';
}

interface AxiosLikeError {
  isAxiosError: boolean;
  response?: {
    status: number;
    data?: { message?: string };
  };
  code?: string;
  message?: string;
}

export function mapAxiosError(error: AxiosLikeError): CliError {
  const response = error.response;

  if (response) {
    const msg = response.data?.message || `HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      return new CliError(msg, ExitCode.AuthError, 'Check your API key with: lifi auth test');
    }

    if (response.status === 429) {
      return new CliError(msg, ExitCode.ApiError, 'Rate limited. Set an API key with: lifi auth set <key>');
    }

    if (response.status >= 400) {
      return new CliError(msg, ExitCode.ApiError);
    }
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new CliError(
      error.message || 'Network error',
      ExitCode.NetworkError,
      'Check your internet connection and try again.',
    );
  }

  return new CliError(error.message || 'An unexpected error occurred', ExitCode.General);
}

export function handleError(error: unknown): never {
  const verbose = process.env['LIFI_VERBOSE'] === '1';

  if (error instanceof CliError) {
    console.error(formatError(error));
    if (verbose && error.stack) {
      console.error('\n' + error.stack);
    }
    process.exit(error.exitCode);
  }

  console.error(formatError(error));
  if (verbose && error instanceof Error && error.stack) {
    console.error('\n' + error.stack);
  }
  process.exit(ExitCode.General);
}
