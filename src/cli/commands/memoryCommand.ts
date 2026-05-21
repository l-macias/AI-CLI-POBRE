import { ProjectMemoryStore } from '../../memory/ProjectMemoryStore.js';
import type {
  ProjectKnownFileMemory,
  ProjectMemoryEntry,
  ProjectMemoryTrustLevel,
} from '../../memory/ProjectMemoryTypes.js';
import type { CliCommandHandler } from '../CliCommandHandler.js';
import type { CliMemoryCommand } from '../CliTypes.js';

export interface MemoryCommandOutput {
  action: CliMemoryCommand['action'];
  projectRoot: string;
  memoryFile: string;
  status: 'ok' | 'cleared' | 'blocked';
  summary: {
    projectName: string;
    entries: number;
    knownFiles: number;
    updatedAt: string;
    trustLevels: Record<ProjectMemoryTrustLevel, number>;
  };
  entries?: MemoryEntryListItem[] | undefined;
  knownFiles?: MemoryKnownFileListItem[] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  document?: unknown | undefined;
  selectedEntry?: MemoryEntryListItem | undefined;
  selectedKnownFile?: MemoryKnownFileListItem | undefined;
  issues: {
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }[];
}

export interface MemoryEntryListItem {
  id: string;
  kind: string;
  title: string;
  importance: string;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  source?: string | undefined;
  createdAt: string;
  updatedAt: string;
  contentPreview?: string | undefined;
  content?: string | undefined;
}

export interface MemoryKnownFileListItem {
  path: string;
  summary: string;
  importance: string;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  lastSeenAt: string;
}

export class MemoryCommand implements CliCommandHandler<CliMemoryCommand> {
  public readonly name = 'memory';

  public async execute(command: CliMemoryCommand): Promise<MemoryCommandOutput> {
    const projectRoot = command.projectRoot ?? process.cwd();
    const store = new ProjectMemoryStore({
      projectRoot,
      projectName: 'target-project',
    });

    if (command.action === 'clear') {
      return this.clearMemory({
        command,
        store,
        projectRoot,
      });
    }

    const document = await store.load();

    const base = {
      action: command.action,
      projectRoot,
      memoryFile: store.getMemoryFilePath(),
      status: 'ok' as const,
      summary: {
        projectName: document.projectName,
        entries: document.entries.length,
        knownFiles: document.knownFiles.length,
        updatedAt: document.updatedAt,
        trustLevels: this.countTrustLevels(document.entries, document.knownFiles),
      },
      issues: [],
    };

    if (command.action === 'list') {
      return {
        ...base,
        entries: document.entries.map((entry) => this.renderEntrySummary(entry)),
        knownFiles: document.knownFiles.map((file) => this.renderKnownFile(file)),
      };
    }

    const selectedEntry = command.entryId
      ? document.entries.find((entry) => entry.id === command.entryId)
      : undefined;

    const selectedKnownFile = command.entryId
      ? document.knownFiles.find((file) => file.path === command.entryId)
      : undefined;

    if (command.entryId && !selectedEntry && !selectedKnownFile) {
      return {
        ...base,
        status: 'blocked',
        issues: [
          {
            code: 'MEMORY_ENTRY_NOT_FOUND',
            message: `Memory entry or known file was not found: ${command.entryId}`,
            severity: 'error',
          },
        ],
      };
    }

    return {
      ...base,
      document: command.entryId ? undefined : document,
      selectedEntry: selectedEntry ? this.renderEntryFull(selectedEntry) : undefined,
      selectedKnownFile: selectedKnownFile ? this.renderKnownFile(selectedKnownFile) : undefined,
    };
  }

  private async clearMemory(input: {
    command: CliMemoryCommand;
    store: ProjectMemoryStore;
    projectRoot: string;
  }): Promise<MemoryCommandOutput> {
    const current = await input.store.load();

    if (!input.command.confirmClear) {
      return {
        action: 'clear',
        projectRoot: input.projectRoot,
        memoryFile: input.store.getMemoryFilePath(),
        status: 'blocked',
        summary: {
          projectName: current.projectName,
          entries: current.entries.length,
          knownFiles: current.knownFiles.length,
          updatedAt: current.updatedAt,
          trustLevels: this.countTrustLevels(current.entries, current.knownFiles),
        },
        issues: [
          {
            code: 'MEMORY_CLEAR_CONFIRM_REQUIRED',
            message: 'memory clear requires --confirm.',
            severity: 'error',
          },
        ],
      };
    }

    const now = new Date().toISOString();
    const cleared = await input.store.save({
      version: 1,
      projectName: current.projectName,
      projectRoot: input.projectRoot,
      entries: [],
      knownFiles: [],
      createdAt: current.createdAt,
      updatedAt: now,
    });

    return {
      action: 'clear',
      projectRoot: input.projectRoot,
      memoryFile: input.store.getMemoryFilePath(),
      status: 'cleared',
      summary: {
        projectName: cleared.projectName,
        entries: cleared.entries.length,
        knownFiles: cleared.knownFiles.length,
        updatedAt: cleared.updatedAt,
        trustLevels: this.countTrustLevels(cleared.entries, cleared.knownFiles),
      },
      issues: [],
    };
  }

  private renderEntrySummary(entry: ProjectMemoryEntry): MemoryEntryListItem {
    return {
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      importance: entry.importance,
      trustLevel: entry.trustLevel,
      tags: [...entry.tags],
      source: entry.source,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      contentPreview: this.preview(entry.content),
    };
  }

  private renderEntryFull(entry: ProjectMemoryEntry): MemoryEntryListItem {
    return {
      ...this.renderEntrySummary(entry),
      content: entry.content,
    };
  }

  private renderKnownFile(file: ProjectKnownFileMemory): MemoryKnownFileListItem {
    return {
      path: file.path,
      summary: file.summary,
      importance: file.importance,
      trustLevel: file.trustLevel,
      tags: [...file.tags],
      lastSeenAt: file.lastSeenAt,
    };
  }

  private countTrustLevels(
    entries: readonly ProjectMemoryEntry[],
    knownFiles: readonly ProjectKnownFileMemory[],
  ): Record<ProjectMemoryTrustLevel, number> {
    const counts: Record<ProjectMemoryTrustLevel, number> = {
      'user-approved': 0,
      'runtime-generated': 0,
      'provider-suggested': 0,
      quarantined: 0,
    };

    for (const entry of entries) {
      counts[entry.trustLevel] += 1;
    }

    for (const file of knownFiles) {
      counts[file.trustLevel] += 1;
    }

    return counts;
  }

  private preview(value: string): string {
    const compact = value.replace(/\s+/g, ' ').trim();

    if (compact.length <= 140) {
      return compact;
    }

    return `${compact.slice(0, 137)}...`;
  }
}
