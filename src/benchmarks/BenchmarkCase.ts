import type {
  BenchmarkCase,
  BenchmarkCaseContext,
  BenchmarkCaseExecutionOutput,
  BenchmarkCaseInput,
} from '../types/BenchmarkTypes.js';

export type BenchmarkCaseRunner = (
  context: BenchmarkCaseContext,
) => Promise<BenchmarkCaseExecutionOutput>;

export class StaticBenchmarkCase implements BenchmarkCase {
  public readonly input: BenchmarkCaseInput;
  private readonly runner: BenchmarkCaseRunner;

  public constructor(input: BenchmarkCaseInput, runner: BenchmarkCaseRunner) {
    this.input = input;
    this.runner = runner;
  }

  public run(context: BenchmarkCaseContext): Promise<BenchmarkCaseExecutionOutput> {
    return this.runner(context);
  }
}
