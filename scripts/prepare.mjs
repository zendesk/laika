import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

if (!existsSync(path.join(process.cwd(), '.git'))) {
  process.exit(0)
}

execFileSync('husky', ['install', '.config/husky'], {
  stdio: 'inherit',
})
