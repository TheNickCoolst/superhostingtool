import prisma from '../lib/prisma';
import { VM } from 'vm2';
import type {
  ServerlessFunction,
  FunctionTrigger,
  FunctionLanguage,
  FunctionExecution,
  ExecutionStatus
} from '@prisma/client';

/**
 * Serverless Functions Service
 *
 * Execute custom code in response to events
 * - JavaScript/Python/Lua support
 * - Event-driven triggers
 * - Scheduled execution
 * - HTTP endpoints
 */
class ServerlessService {

  /**
   * Create serverless function
   */
  async createFunction(
    userId: string,
    name: string,
    code: string,
    trigger: FunctionTrigger,
    language: FunctionLanguage = 'JAVASCRIPT',
    options?: {
      description?: string;
      timeout?: number;
      environment?: any;
    }
  ): Promise<ServerlessFunction> {
    return await prisma.serverlessFunction.create({
      data: {
        userId,
        name,
        code,
        trigger,
        language,
        description: options?.description,
        timeout: options?.timeout || 30000,
        environment: options?.environment,
        enabled: true
      }
    });
  }

  /**
   * Update function
   */
  async updateFunction(
    functionId: string,
    updates: Partial<{
      name: string;
      description: string;
      code: string;
      enabled: boolean;
      timeout: number;
      environment: any;
    }>
  ): Promise<ServerlessFunction> {
    return await prisma.serverlessFunction.update({
      where: { id: functionId },
      data: updates
    });
  }

  /**
   * Delete function
   */
  async deleteFunction(functionId: string): Promise<void> {
    await prisma.serverlessFunction.delete({
      where: { id: functionId }
    });
  }

  /**
   * Execute function
   */
  async executeFunction(
    functionId: string,
    input?: any
  ): Promise<FunctionExecution> {
    const func = await prisma.serverlessFunction.findUnique({
      where: { id: functionId }
    });

    if (!func) {
      throw new Error('Function not found');
    }

    if (!func.enabled) {
      throw new Error('Function is disabled');
    }

    // Create execution record
    const execution = await prisma.functionExecution.create({
      data: {
        functionId,
        input,
        status: 'RUNNING',
        startedAt: new Date()
      }
    });

    // Execute function
    this.runFunction(execution.id, func, input).catch(error => {
      console.error(`Function execution failed: ${execution.id}`, error);
    });

    // Update execution count
    await prisma.serverlessFunction.update({
      where: { id: functionId },
      data: {
        executionCount: { increment: 1 },
        lastRun: new Date()
      }
    });

    return execution;
  }

  /**
   * Run function in sandbox
   */
  private async runFunction(
    executionId: string,
    func: ServerlessFunction,
    input: any
  ): Promise<void> {
    const startTime = Date.now();

    try {
      let result: any;

      if (func.language === 'JAVASCRIPT') {
        result = await this.runJavaScript(func.code, input, func.environment, func.timeout);
      } else if (func.language === 'PYTHON') {
        result = await this.runPython(func.code, input, func.environment, func.timeout);
      } else if (func.language === 'LUA') {
        result = await this.runLua(func.code, input, func.environment, func.timeout);
      } else {
        throw new Error(`Unsupported language: ${func.language}`);
      }

      const duration = Date.now() - startTime;

      await prisma.functionExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          output: result,
          duration,
          completedAt: new Date()
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const status: ExecutionStatus = duration >= func.timeout ? 'TIMEOUT' : 'FAILED';

      await prisma.functionExecution.update({
        where: { id: executionId },
        data: {
          status,
          error: error.message,
          duration,
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Run JavaScript code in VM
   */
  private async runJavaScript(
    code: string,
    input: any,
    environment: any,
    timeout: number
  ): Promise<any> {
    const vm = new VM({
      timeout,
      sandbox: {
        input,
        env: environment || {},
        console: {
          log: (...args: any[]) => console.log('[Function]', ...args)
        }
      }
    });

    // Wrap code in async function
    const wrappedCode = `
      (async function() {
        ${code}
      })()
    `;

    return await vm.run(wrappedCode);
  }

  /**
   * Run Python code (requires python runtime)
   */
  private async runPython(
    code: string,
    input: any,
    environment: any,
    timeout: number
  ): Promise<any> {
    // TODO: Implement Python execution
    // Would require python runtime and process spawning
    throw new Error('Python execution not yet implemented');
  }

  /**
   * Run Lua code
   */
  private async runLua(
    code: string,
    input: any,
    environment: any,
    timeout: number
  ): Promise<any> {
    // TODO: Implement Lua execution
    // Would require lua runtime (fengari or similar)
    throw new Error('Lua execution not yet implemented');
  }

  /**
   * Get user's functions
   */
  async getUserFunctions(userId: string): Promise<ServerlessFunction[]> {
    return await prisma.serverlessFunction.findMany({
      where: { userId },
      include: {
        executions: {
          take: 5,
          orderBy: { startedAt: 'desc' }
        }
      }
    });
  }

  /**
   * Get function executions
   */
  async getFunctionExecutions(
    functionId: string,
    limit: number = 50
  ): Promise<FunctionExecution[]> {
    return await prisma.functionExecution.findMany({
      where: { functionId },
      orderBy: { startedAt: 'desc' },
      take: limit
    });
  }

  /**
   * Trigger functions by event
   */
  async triggerByEvent(event: string, data: any): Promise<void> {
    const functions = await prisma.serverlessFunction.findMany({
      where: {
        enabled: true,
        trigger: 'SERVER_EVENT'
      }
    });

    // Execute all matching functions
    await Promise.all(
      functions.map(func =>
        this.executeFunction(func.id, { event, data })
      )
    );
  }

  /**
   * Get function statistics
   */
  async getFunctionStats(functionId: string): Promise<any> {
    const executions = await prisma.functionExecution.findMany({
      where: { functionId }
    });

    const total = executions.length;
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const timeout = executions.filter(e => e.status === 'TIMEOUT').length;

    const avgDuration = executions.length > 0
      ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
      : 0;

    return {
      functionId,
      totalExecutions: total,
      successful: completed,
      failed,
      timeouts: timeout,
      successRate: total > 0 ? (completed / total * 100).toFixed(2) + '%' : '0%',
      averageDuration: `${avgDuration.toFixed(0)}ms`
    };
  }
}

export default new ServerlessService();
