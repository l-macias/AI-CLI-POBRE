export class CliErrorPresenter {
  public present(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
