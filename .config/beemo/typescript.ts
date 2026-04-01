import type { TypeScriptConfig } from '@beemo/driver-typescript'
import { FOLDER_IGNORE_LIST } from '@niieani/scaffold-config-constants'

const config: TypeScriptConfig = {
  exclude: [...FOLDER_IGNORE_LIST, 'scripts/', 'tests/'],
}

export default config
