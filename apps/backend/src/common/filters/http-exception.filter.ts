import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Khmer error messages for common HTTP codes
const KHMER_ERROR_MESSAGES: Record<number, string> = {
  400: 'សំណើមិនត្រឹមត្រូវ',
  401: 'សូមចូលគណនីជាមុនសិន',
  403: 'អ្នកមិនមានសិទ្ធិធ្វើសកម្មភាពនេះទេ',
  404: 'រកមិនឃើញអ្វីដែលអ្នកស្វែងរកទេ',
  409: 'ទិន្នន័យនេះមានជាស្រាប់ហើយ',
  422: 'ទិន្នន័យដែលផ្ញើមកមិនត្រឹមត្រូវ',
  429: 'អ្នកបានផ្ញើសំណើច្រើនពេកក្នុងពេលខ្លី',
  500: 'មានបញ្ហាប្រព័ន្ធ',
  503: 'ប្រព័ន្ធកំពុងជួសជុល',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = KHMER_ERROR_MESSAGES[500];
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        // If the exception message is already in Khmer or is a business error, pass it through
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || KHMER_ERROR_MESSAGES[status] || 'មានបញ្ហា';
        errorCode = resp.errorCode as string;
      }

      // Use Khmer fallback for generic messages
      if (Array.isArray(message) && message.length === 0) {
        message = KHMER_ERROR_MESSAGES[status] || 'មានបញ្ហា';
      }
    } else if (exception instanceof Error) {
      // Only log in non-production
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      } else {
        this.logger.error(`Unhandled exception at ${request.method} ${request.url}`);
      }
    }

    // Never expose stack traces to clients
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errorCode && { errorCode }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
