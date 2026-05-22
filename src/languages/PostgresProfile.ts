export interface PostgresProfileResult {
  hasPostgres: boolean;
  hasPrisma: boolean;
  hasPg: boolean;
  prismaSchemaFiles: string[];
  queryFiles: string[];
  envUsageFiles: string[];
}

export class PostgresProfile {
  public detect(input: {
    files: string[];
    dependencies: Record<string, string>;
    fileContents: Record<string, string>;
  }): PostgresProfileResult {
    const hasPrisma = 'prisma' in input.dependencies || '@prisma/client' in input.dependencies;
    const hasPg = 'pg' in input.dependencies || 'postgres' in input.dependencies;

    const prismaSchemaFiles = input.files.filter((file) => {
      return file.replaceAll('\\', '/').endsWith('prisma/schema.prisma');
    });

    const queryFiles = input.files.filter((file) => {
      const content = input.fileContents[file] ?? '';

      return (
        content.includes('new PrismaClient') ||
        content.includes('prisma.') ||
        content.includes('Pool') ||
        content.includes('Client') ||
        content.includes('SELECT ') ||
        content.includes('INSERT ') ||
        content.includes('UPDATE ') ||
        content.includes('DELETE ')
      );
    });

    const envUsageFiles = input.files.filter((file) => {
      const content = input.fileContents[file] ?? '';

      return (
        content.includes('DATABASE_URL') ||
        content.includes('POSTGRES_URL') ||
        content.includes('PGHOST') ||
        content.includes('process.env')
      );
    });

    return {
      hasPostgres: hasPg || hasPrisma || prismaSchemaFiles.length > 0 || queryFiles.length > 0,
      hasPrisma,
      hasPg,
      prismaSchemaFiles,
      queryFiles,
      envUsageFiles,
    };
  }
}
