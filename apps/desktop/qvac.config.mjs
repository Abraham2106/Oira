import os from "node:os"
import path from "node:path"

/**
 * Local development weights outside OneDrive (avoids sync/file-lock crashes).
 * Override with QVAC_CONFIG_PATH if needed. Never commit the artifacts.
 */
export default {
  cacheDirectory: path.join(os.homedir(), "AppData", "Local", "Oira", "qvac-models"),
}
