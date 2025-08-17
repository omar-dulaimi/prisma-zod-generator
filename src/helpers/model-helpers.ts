import { DMMF } from '@prisma/generator-helper';
import Transformer from '../transformer';

export function checkModelHasModelRelation(model: DMMF.Model) {
  const { fields: modelFields } = model;
  for (const modelField of modelFields) {
    const isRelationField = checkIsModelRelationField(modelField);
    if (isRelationField) {
      return true;
    }
  }
  return false;
}

export function checkModelHasManyModelRelation(model: DMMF.Model) {
  const { fields: modelFields } = model;
  for (const modelField of modelFields) {
    const isManyRelationField = checkIsManyModelRelationField(modelField);
    if (isManyRelationField) {
      return true;
    }
  }
  return false;
}

export function checkIsModelRelationField(modelField: DMMF.Field) {
  const { kind, relationName } = modelField;
  return kind === 'object' && !!relationName;
}

export function checkIsManyModelRelationField(modelField: DMMF.Field) {
  return checkIsModelRelationField(modelField) && modelField.isList;
}

export function findModelByName(models: DMMF.Model[], modelName: string) {
  return models.find(({ name }) => name === modelName);
}

/**
 * Filtering-aware helper functions that respect generator configuration
 */

/**
 * Check if model has enabled model relations (filters out disabled models)
 */
export function checkModelHasEnabledModelRelation(model: DMMF.Model): boolean {
  const { fields: modelFields } = model;
  for (const modelField of modelFields) {
    const isRelationField = checkIsModelRelationField(modelField);
    if (isRelationField) {
      // Check if the related model is enabled
      const relatedModelEnabled = Transformer.isModelEnabled(modelField.type);
      if (relatedModelEnabled) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if model has enabled many model relations (filters out disabled models)
 */
export function checkModelHasEnabledManyModelRelation(model: DMMF.Model): boolean {
  const { fields: modelFields } = model;
  for (const modelField of modelFields) {
    const isManyRelationField = checkIsManyModelRelationField(modelField);
    if (isManyRelationField) {
      // Check if the related model is enabled
      const relatedModelEnabled = Transformer.isModelEnabled(modelField.type);
      if (relatedModelEnabled) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get filtered model fields based on field exclusion configuration
 */
export function getFilteredModelFields(
  model: DMMF.Model,
  variant: 'pure' | 'input' | 'result',
): DMMF.Field[] {
  return model.fields.filter((field) => {
    return Transformer.isFieldEnabled(field.name, model.name, variant);
  });
}

/**
 * Get enabled models from a list of models
 */
export function getEnabledModels(models: DMMF.Model[]): DMMF.Model[] {
  return models.filter((model) => Transformer.isModelEnabled(model.name));
}

/**
 * Get enabled relation fields from a model
 */
export function getEnabledRelationFields(model: DMMF.Model): DMMF.Field[] {
  return model.fields.filter((field) => {
    if (!checkIsModelRelationField(field)) {
      return false;
    }
    // Check if the related model is enabled
    if (!Transformer.isModelEnabled(field.type)) {
      return false;
    }
    // Check if the field itself is enabled according to configuration (not excluded)
    if (!Transformer.isFieldEnabled(field.name, model.name, 'result')) {
      return false;
    }
    return true;
  });
}

/**
 * Check if a model has any enabled operations
 */
export function modelHasEnabledOperations(modelName: string): boolean {
  const config = Transformer.getGeneratorConfig();
  if (!config) return true;

  const modelConfig = config.models?.[modelName];
  if (!modelConfig?.operations) return true;

  return modelConfig.operations.length > 0;
}

/**
 * Get enabled operations for a model
 */
export function getEnabledOperationsForModel(modelName: string): string[] {
  const config = Transformer.getGeneratorConfig();
  if (!config) return [];

  const modelConfig = config.models?.[modelName];
  if (!modelConfig?.operations) return [];

  return modelConfig.operations;
}

/**
 * Check if a specific operation is enabled for a model
 */
export function isOperationEnabledForModel(modelName: string, operation: string): boolean {
  const enabledOperations = getEnabledOperationsForModel(modelName);
  if (enabledOperations.length === 0) return true; // Default to enabled if no restrictions

  return enabledOperations.includes(operation);
}
