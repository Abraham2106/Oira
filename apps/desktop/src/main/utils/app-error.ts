/**
 * Compatibility barrel. Prefer `../errors` (and domain modules under
 * `../errors/*.ts`) so call sites do not grow into a single catch-all file.
 */
export {
  createAppError,
  isAppError,
  toSerializableError,
} from "../errors/core"
export type { AppError } from "../errors/core"
