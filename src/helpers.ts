export const isMongodbRawOp = (name: string) =>
  /find([^]*?)Raw/.test(name) || /aggregate([^]*?)Raw/.test(name);
