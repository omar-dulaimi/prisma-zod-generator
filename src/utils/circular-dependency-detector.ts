import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';

/**
 * Represents a relationship between two models
 */
interface ModelRelation {
  fromModel: string;
  toModel: string;
  fieldName: string;
  relationName?: string;
  isOptional: boolean;
  isList: boolean;
}

/**
 * Result of circular dependency detection
 */
export interface CircularDependencyResult {
  /** Map of model name -> set of relation field names that should be excluded to break cycles */
  excludedRelations: Map<string, Set<string>>;
  /** List of detected cycles for debugging */
  cycles: string[][];
}

/**
 * Detects circular dependencies in Prisma model relationships and determines
 * which relations should be excluded to break the cycles.
 */
export class CircularDependencyDetector {
  private models: PrismaDMMF.Model[];
  private relationGraph: Map<string, ModelRelation[]> = new Map();

  constructor(models: PrismaDMMF.Model[]) {
    this.models = models;
    this.buildRelationGraph();
  }

  /**
   * Build a graph of all model relationships
   */
  private buildRelationGraph(): void {
    for (const model of this.models) {
      const relations: ModelRelation[] = [];

      for (const field of model.fields) {
        // Only process relation fields (kind === 'object')
        if (field.kind === 'object') {
          relations.push({
            fromModel: model.name,
            toModel: field.type,
            fieldName: field.name,
            relationName: field.relationName,
            isOptional: !field.isRequired,
            isList: field.isList,
          });
        }
      }

      this.relationGraph.set(model.name, relations);
    }
  }

  /**
   * Detect problematic circular dependencies (not just any cycle).
   * Only considers cycles that would cause TypeScript compilation issues.
   */
  private detectProblematicCycles(): string[][] {
    const problematicCycles: string[][] = [];

    // Find direct bidirectional relationships (A -> B and B -> A)
    for (const model of this.models) {
      const modelRelations = this.relationGraph.get(model.name) || [];

      for (const relation of modelRelations) {
        const targetModel = relation.toModel;

        // Skip self-references for now (handle separately)
        if (targetModel === model.name) continue;

        // Check if target model has a relation back to this model
        const targetRelations = this.relationGraph.get(targetModel) || [];
        const backReference = targetRelations.find((r) => r.toModel === model.name);

        if (backReference) {
          // Found bidirectional relationship - this is potentially problematic
          // Only add if we haven't already added the reverse
          const cycleExists = problematicCycles.some(
            (cycle) =>
              cycle.length === 3 &&
              cycle[0] === targetModel &&
              cycle[1] === model.name &&
              cycle[2] === targetModel,
          );

          if (!cycleExists) {
            problematicCycles.push([model.name, targetModel, model.name]);
          }
        }
      }
    }

    // Handle self-referencing models
    for (const model of this.models) {
      const modelRelations = this.relationGraph.get(model.name) || [];
      const selfReferences = modelRelations.filter((r) => r.toModel === model.name);

      if (selfReferences.length > 1) {
        // Multiple self-references create circular dependencies
        problematicCycles.push([model.name, model.name]);
      }
    }

    return problematicCycles;
  }

  /**
   * Determine which relations to exclude to break cycles.
   * Strategy: For bidirectional relationships, prefer to exclude optional relations
   * over required ones, and exclude "back-references" over "forward-references".
   */
  private determineExclusions(cycles: string[][]): Map<string, Set<string>> {
    const exclusions = new Map<string, Set<string>>();

    for (const cycle of cycles) {
      // Handle self-referencing cycles (model -> model)
      if (cycle.length === 2 && cycle[0] === cycle[1]) {
        const modelName = cycle[0];
        const relations = this.relationGraph.get(modelName) || [];
        const selfReferences = relations.filter((r) => r.toModel === modelName);

        if (selfReferences.length > 1) {
          // For multiple self-references, exclude all but one
          // Keep the first one, exclude the rest
          for (let i = 1; i < selfReferences.length; i++) {
            if (!exclusions.has(modelName)) {
              exclusions.set(modelName, new Set());
            }
            exclusions.get(modelName)?.add(selfReferences[i].fieldName);
          }
        }
        continue;
      }

      // Handle bidirectional relationships (A -> B -> A)
      if (cycle.length === 3 && cycle[0] === cycle[2]) {
        const modelA = cycle[0];
        const modelB = cycle[1];

        const relationsA = this.relationGraph.get(modelA) || [];
        const relationsB = this.relationGraph.get(modelB) || [];

        const relationAtoB = relationsA.find((r) => r.toModel === modelB);
        const relationBtoA = relationsB.find((r) => r.toModel === modelA);

        if (relationAtoB && relationBtoA) {
          // Decide which relation to exclude based on priority:
          // 1. Prefer to keep required relations over optional ones
          // 2. Prefer to keep non-list relations over list relations
          // 3. If equal, exclude the "back-reference" (second relation found)

          let excludeRelation: { model: string; field: string } | null = null;

          if (relationAtoB.isOptional && !relationBtoA.isOptional) {
            // A->B is optional, B->A is required: exclude A->B
            excludeRelation = { model: modelA, field: relationAtoB.fieldName };
          } else if (!relationAtoB.isOptional && relationBtoA.isOptional) {
            // A->B is required, B->A is optional: exclude B->A
            excludeRelation = { model: modelB, field: relationBtoA.fieldName };
          } else if (relationAtoB.isList && !relationBtoA.isList) {
            // A->B is array, B->A is single: exclude A->B (keep the FK side)
            excludeRelation = { model: modelA, field: relationAtoB.fieldName };
          } else if (!relationAtoB.isList && relationBtoA.isList) {
            // A->B is single, B->A is array: exclude B->A (keep the FK side)
            excludeRelation = { model: modelB, field: relationBtoA.fieldName };
          } else {
            // If equal priority, exclude the alphabetically later model's relation
            // This provides consistent behavior
            if (modelA.localeCompare(modelB) > 0) {
              excludeRelation = { model: modelA, field: relationAtoB.fieldName };
            } else {
              excludeRelation = { model: modelB, field: relationBtoA.fieldName };
            }
          }

          if (excludeRelation) {
            if (!exclusions.has(excludeRelation.model)) {
              exclusions.set(excludeRelation.model, new Set());
            }
            exclusions.get(excludeRelation.model)?.add(excludeRelation.field);
          }
        }
      }
    }

    return exclusions;
  }

  /**
   * Detect circular dependencies and return which relations should be excluded
   */
  public detect(): CircularDependencyResult {
    const cycles = this.detectProblematicCycles();
    const excludedRelations = this.determineExclusions(cycles);

    return {
      excludedRelations,
      cycles,
    };
  }
}

/**
 * Utility function to detect circular dependencies in Prisma models
 */
export function detectCircularDependencies(models: PrismaDMMF.Model[]): CircularDependencyResult {
  const detector = new CircularDependencyDetector(models);
  return detector.detect();
}
