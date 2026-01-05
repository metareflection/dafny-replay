// bundle-extras.ts - Thin wrappers around compiled Dafny functions
// These provide a convenient JS interface for the edge function.

import {
  TodoMultiProjectDomain,
  _dafny,
  multimodelFromJson,
  multimodelToJson,
  multiactionFromJson,
  dafnyStringToJs,
} from './dafny-bundle.ts'

// Result type for tryMultiStep
export interface MultiStepResult {
  status: 'accepted' | 'rejected';
  multiModel?: { projects: Record<string, unknown> };
  changedProjects?: string[];
  error?: string;
}

/**
 * Try to apply a multi-action to a multi-model.
 * Uses VERIFIED Dafny TryMultiStep.
 */
export function tryMultiStep(
  multiModelJson: { projects: Record<string, unknown> },
  multiActionJson: unknown
): MultiStepResult {
  try {
    const mm = multimodelFromJson(multiModelJson);
    const action = multiactionFromJson(multiActionJson);

    // Call VERIFIED TryMultiStep
    const result = TodoMultiProjectDomain.__default.TryMultiStep(mm, action);

    if (result.is_Ok) {
      const newMM = result.dtor_value;
      const newMMJson = multimodelToJson(newMM);

      // Call VERIFIED ChangedProjects
      const changedSet = TodoMultiProjectDomain.__default.ChangedProjects(mm, newMM);
      const changedProjects = Array.from(changedSet.Elements || []).map(dafnyStringToJs);

      return {
        status: 'accepted',
        multiModel: newMMJson,
        changedProjects
      };
    } else {
      // Call VERIFIED MultiErrToString
      const errStr = TodoMultiProjectDomain.__default.MultiErrToString(result.dtor_error);
      return {
        status: 'rejected',
        error: dafnyStringToJs(errStr)
      };
    }
  } catch (e) {
    return {
      status: 'rejected',
      error: String(e)
    };
  }
}

/**
 * Check if a user is authorized to perform a multi-action.
 * Uses VERIFIED Dafny CheckAuthorization.
 * Returns empty string if authorized, error message if not.
 */
export function checkAuthorization(
  multiModelJson: { projects: Record<string, unknown> },
  actingUser: string,
  multiActionJson: unknown
): string {
  try {
    const mm = multimodelFromJson(multiModelJson);
    const userSeq = _dafny.Seq.UnicodeFromString(actingUser);
    const action = multiactionFromJson(multiActionJson);

    // Call VERIFIED CheckAuthorization
    const result = TodoMultiProjectDomain.__default.CheckAuthorization(mm, userSeq, action);
    return dafnyStringToJs(result);
  } catch (e) {
    return `Authorization check failed: ${String(e)}`;
  }
}

/**
 * Get the list of project IDs touched by a multi-action.
 * Uses VERIFIED Dafny TouchedProjects.
 */
export function getTouchedProjects(multiActionJson: unknown): string[] {
  const action = multiactionFromJson(multiActionJson);
  const touchedSet = TodoMultiProjectDomain.__default.TouchedProjects(action);
  return Array.from(touchedSet.Elements || []).map(dafnyStringToJs);
}
