export const isMongodbRawOp = (name: string) =>
  /find([^]*?)Raw/.test(name) || /aggregate([^]*?)Raw/.test(name);

export const isAggregateOutputType = (name: string) =>
  /(?:Count|Avg|Sum|Min|Max)AggregateOutputType$/.test(name);
