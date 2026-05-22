export interface MongoProfileResult {
  hasMongo: boolean;
  hasMongoose: boolean;
  modelFiles: string[];
  connectionFiles: string[];
}

export class MongoProfile {
  public detect(input: {
    files: string[];
    dependencies: Record<string, string>;
    fileContents: Record<string, string>;
  }): MongoProfileResult {
    const hasMongoose = 'mongoose' in input.dependencies;
    const hasMongoDriver = 'mongodb' in input.dependencies;

    const modelFiles = input.files.filter((file) => {
      const normalized = file.replaceAll('\\', '/').toLowerCase();
      const content = input.fileContents[file] ?? '';

      return (
        normalized.includes('/models/') ||
        normalized.includes('/schemas/') ||
        content.includes('new Schema') ||
        content.includes('mongoose.model')
      );
    });

    const connectionFiles = input.files.filter((file) => {
      const content = input.fileContents[file] ?? '';

      return (
        content.includes('mongoose.connect') ||
        content.includes('MongoClient') ||
        content.includes('MONGO_URI') ||
        content.includes('MONGODB_URI')
      );
    });

    return {
      hasMongo:
        hasMongoDriver || hasMongoose || modelFiles.length > 0 || connectionFiles.length > 0,
      hasMongoose,
      modelFiles,
      connectionFiles,
    };
  }
}
